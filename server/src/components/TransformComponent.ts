import { PathfindingNodeIndex } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { getEntityCollisionGroup } from "battletribes-shared/collision-groups";
import { assert, Point, randFloat, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import Layer from "../Layer";
import Chunk from "../Chunk";
import { Entity, EntityTypeString } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { AIHelperComponentArray, entityIsNoticedByAI } from "./AIHelperComponent";
import { tickEntityPhysics } from "./PhysicsComponent";
import { clearEntityPathfindingNodes, entityCanBlockPathfinding, updateEntityPathfindingNodeOccupance } from "../pathfinding";
import { resolveWallCollision } from "../collision-resolution";
import { Packet } from "battletribes-shared/packets";
import { Box, boxIsCircular, HitboxFlag, updateBox } from "battletribes-shared/boxes/boxes";
import { destroyEntity, entityExists, getEntityLayer, getEntityType, setEntityLayer } from "../world";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { removeEntityLights, updateEntityLights } from "../light-levels";
import { registerDirtyEntity } from "../server/player-clients";
import { surfaceLayer } from "../layers";
import { addHitboxDataToPacket, getHitboxDataLength } from "../server/packet-hitboxes";
import { Hitbox } from "../hitboxes";
import { EntityConfig } from "../components";

interface AngularTetherInfo {
   readonly springConstant: number;
   readonly angularDamping: number;
   /** Radians either side of the ideal angle for which the link is allowed to be in without being pulled */
   readonly padding: number;
}

interface HitboxTether {
   readonly hitbox: Hitbox;
   readonly originHitbox: Hitbox;
   
   readonly idealDistance: number;
   readonly springConstant: number;
   readonly damping: number;

   readonly affectsOriginHitbox: boolean;

   readonly angularTether?: AngularTetherInfo;

   // Used for verlet integration
   // @Cleanup: unused?
   previousPositionX: number;
   previousPositionY: number;
}

export interface EntityAttachInfo {
   readonly attachedEntity: Entity;
   /** Parented to a hitbox of the parent entity, or just the parent entity itself */
   readonly parent: Hitbox | null;
   /** If true, when the parent entity is destroyed, the child will be destroyed as well. */
   readonly destroyWhenParentIsDestroyed: boolean;
}

const enum TransformNodeType {
   hitbox,
   entity
}

export type TransformNode = Hitbox | EntityAttachInfo;

// @Cleanup: move mass/hitbox related stuff out? (Are there any entities which could take advantage of that extraction?)

export class TransformComponent {
   // @Speed: may want to re-introduce the totalMass property
   
   // @Cleanup: unused?
   public collisionPushForceMultiplier = 1;
 
   /** All chunks the entity is contained in */
   public readonly chunks = new Array<Chunk>();

   public rootEntity: Entity = 0;
   public parentEntity: Entity = 0;
   
   /** All children attached to the entity */
   public readonly children = new Array<TransformNode>();
   /** Children not attached to any hitbox interal to the same entity. Root children can either be children with no parent, or children with a different entity's hitbox as a parent. */
   public readonly rootChildren = new Array<TransformNode>();

   public readonly tethers = new Array<HitboxTether>();
   
   public boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   public boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   /** Whether the entities' position/angle/hitboxes have changed during the current tick or not. */
   public isDirty = false;

   public pathfindingNodesAreDirty = false;
   
   public lastValidLayer = surfaceLayer;

   // @Deprecated: Only used by client
   public collisionBit = COLLISION_BITS.default;
   // @Deprecated: Only used by client
   public collisionMask = DEFAULT_COLLISION_MASK;
   
   public occupiedPathfindingNodes = new Set<PathfindingNodeIndex>();

   public nextHitboxLocalID = 1;

   public addHitboxTether(hitbox: Hitbox, otherHitbox: Hitbox, idealDistance: number, springConstant: number, damping: number, affectsOriginHitbox: boolean, angularTether?: AngularTetherInfo): void {
      const tether: HitboxTether = {
         hitbox: hitbox,
         originHitbox: otherHitbox,
         idealDistance: idealDistance,
         springConstant: springConstant,
         damping: damping,
         affectsOriginHitbox: affectsOriginHitbox,
         previousPositionX: hitbox.box.position.x,
         previousPositionY: hitbox.box.position.y,
         angularTether: angularTether
      };
      this.tethers.push(tether);
   }

   public resolveWallCollisions(entity: Entity): void {
      // Looser check that there are any wall tiles in any of the entities' chunks
      let hasWallTiles = false;
      for (let i = 0; i < this.chunks.length; i++) {
         const chunk = this.chunks[i];
         if (chunk.hasWallTiles) {
            hasWallTiles = true;
         }
      }
      if (!hasWallTiles) {
         return;
      }
      
      const layer = getEntityLayer(entity);
      
      for (let i = 0; i < this.children.length; i++) {
         const hitbox = this.children[i];
         if (!entityChildIsHitbox(hitbox)) {
            continue;
         }
         
         if (hitbox.flags.includes(HitboxFlag.IGNORES_WALL_COLLISIONS)) {
            continue;
         }
         
         const box = hitbox.box;

         const boundsMinX = box.calculateBoundsMinX();
         const boundsMaxX = box.calculateBoundsMaxX();
         const boundsMinY = box.calculateBoundsMinY();
         const boundsMaxY = box.calculateBoundsMaxY();

         const minSubtileX = Math.max(Math.floor(boundsMinX / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
         const maxSubtileX = Math.min(Math.floor(boundsMaxX / Settings.SUBTILE_SIZE), (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
         const minSubtileY = Math.max(Math.floor(boundsMinY / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
         const maxSubtileY = Math.min(Math.floor(boundsMaxY / Settings.SUBTILE_SIZE), (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);

         for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
            for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
               const subtileIndex = getSubtileIndex(subtileX, subtileY);
               if (layer.subtileIsWall(subtileIndex)) {
                  resolveWallCollision(entity, hitbox, subtileX, subtileY);
               }
            }
         }
      }
   }
}

/** Should only be called during entity creation */
export function addHitboxToTransformComponent(transformComponent: TransformComponent, hitbox: Hitbox): void {
   transformComponent.children.push(hitbox);
   if (hitbox.parent === null) {
      transformComponent.rootChildren.push(hitbox);
   } else {
      hitbox.parent.children.push(hitbox);
   }
}

export function addEntityToTransformComponent(transformComponent: TransformComponent, entity: Entity, destroyWhenParentIsDestroyed: boolean): void {
   const attachInfo: EntityAttachInfo = {
      attachedEntity: entity,
      parent: null,
      destroyWhenParentIsDestroyed: destroyWhenParentIsDestroyed
   };

   transformComponent.children.push(attachInfo);
   transformComponent.rootChildren.push(attachInfo);
}

/** Should only be called after an entity is created */
export function addHitboxToEntity(entity: Entity, hitbox: Hitbox): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   transformComponent.children.push(hitbox);
   if (hitbox.parent === null) {
      transformComponent.rootChildren.push(hitbox);
   } else {
      hitbox.parent.children.push(hitbox);
   }

   const box = hitbox.box;
   
   const boundsMinX = box.calculateBoundsMinX();
   const boundsMaxX = box.calculateBoundsMaxX();
   const boundsMinY = box.calculateBoundsMinY();
   const boundsMaxY = box.calculateBoundsMaxY();

   // Update bounding area
   if (boundsMinX < transformComponent.boundingAreaMinX) {
      transformComponent.boundingAreaMinX = boundsMinX;
   }
   if (boundsMaxX > transformComponent.boundingAreaMaxX) {
      transformComponent.boundingAreaMaxX = boundsMaxX;
   }
   if (boundsMinY < transformComponent.boundingAreaMinY) {
      transformComponent.boundingAreaMinY = boundsMinY;
   }
   if (boundsMaxY > transformComponent.boundingAreaMaxY) {
      transformComponent.boundingAreaMaxY = boundsMaxY;
   }

   // If the hitbox is clipping into a border, clean the entities' position so that it doesn't clip
   if (boundsMinX < 0 || boundsMaxX >= Settings.BOARD_UNITS || boundsMinY < 0 || boundsMaxY >= Settings.BOARD_UNITS) {
      cleanTransform(entity);
   }
}

export function entityChildIsHitbox(child: Hitbox | EntityAttachInfo): child is Hitbox {
   return typeof (child as Hitbox).mass !== "undefined";
}

export function entityChildIsEntity(child: Hitbox | EntityAttachInfo): child is EntityAttachInfo {
   return typeof (child as EntityAttachInfo).attachedEntity !== "undefined";
}

const addToChunk = (entity: Entity, layer: Layer, chunk: Chunk): void => {
   chunk.entities.push(entity);

   const chunkIndex = layer.getChunkIndex(chunk);
   const collisionGroup = getEntityCollisionGroup(getEntityType(entity));
   const collisionChunk = layer.getCollisionChunkByIndex(collisionGroup, chunkIndex);
   collisionChunk.entities.push(entity);

   const numViewingMobs = chunk.viewingEntities.length;
   for (let i = 0; i < numViewingMobs; i++) {
      const viewingEntity = chunk.viewingEntities[i];
      const aiHelperComponent = AIHelperComponentArray.getComponent(viewingEntity);

      if (entityIsNoticedByAI(aiHelperComponent, entity)) {
         const idx = aiHelperComponent.potentialVisibleEntities.indexOf(entity);
         if (idx === -1 && viewingEntity !== entity) {
            aiHelperComponent.potentialVisibleEntities.push(entity);
            aiHelperComponent.potentialVisibleEntityAppearances.push(1);
         } else {
            aiHelperComponent.potentialVisibleEntityAppearances[idx]++;
         }
      }
   }
}

const removeFromChunk = (entity: Entity, layer: Layer, chunk: Chunk): void => {
   let idx = chunk.entities.indexOf(entity);
   if (idx !== -1) {
      chunk.entities.splice(idx, 1);
   }

   const chunkIndex = layer.getChunkIndex(chunk);
   const collisionGroup = getEntityCollisionGroup(getEntityType(entity));
   const collisionChunk = layer.getCollisionChunkByIndex(collisionGroup, chunkIndex);
   idx = collisionChunk.entities.indexOf(entity);
   if (idx !== -1) {
      collisionChunk.entities.splice(idx, 1);
   }

   // @Incomplete
   // Remove the entity from the potential visible entities of all entities viewing the chunk
   const numViewingMobs = chunk.viewingEntities.length;
   for (let i = 0; i < numViewingMobs; i++) {
      const viewingEntity = chunk.viewingEntities[i];
      if (viewingEntity === entity) {
         continue;
      }

      const aiHelperComponent = AIHelperComponentArray.getComponent(viewingEntity);

      const idx = aiHelperComponent.potentialVisibleEntities.indexOf(entity);
      // We do this check as decorative entities are sometimes not in the potential visible entities array
      if (idx !== -1) {
         aiHelperComponent.potentialVisibleEntityAppearances[idx]--;
         if (aiHelperComponent.potentialVisibleEntityAppearances[idx] === 0) {
            aiHelperComponent.potentialVisibleEntities.splice(idx, 1);
            aiHelperComponent.potentialVisibleEntityAppearances.splice(idx, 1);
   
            const idx2 = aiHelperComponent.visibleEntities.indexOf(entity);
            if (idx2 !== -1) {
               aiHelperComponent.visibleEntities.splice(idx2, 1);
            }
         }
      }
   }
}

const updateContainingChunks = (transformComponent: TransformComponent, entity: Entity): void => {
   const layer = getEntityLayer(entity);
   
   // Calculate containing chunks
   const containingChunks = new Array<Chunk>();
   for (let i = 0; i < transformComponent.children.length; i++) {
      const hitbox = transformComponent.children[i];
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }
      
      const box = hitbox.box;

      const boundsMinX = box.calculateBoundsMinX();
      const boundsMaxX = box.calculateBoundsMaxX();
      const boundsMinY = box.calculateBoundsMinY();
      const boundsMaxY = box.calculateBoundsMaxY();

      const minChunkX = Math.max(Math.min(Math.floor(boundsMinX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(boundsMaxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(boundsMinY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(boundsMaxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            if (containingChunks.indexOf(chunk) === -1) {
               containingChunks.push(chunk);
            }
         }
      }
   }

   // Add all new chunks
   for (let i = 0; i < containingChunks.length; i++) {
      const chunk = containingChunks[i];
      if (transformComponent.chunks.indexOf(chunk) === -1) {
         addToChunk(entity, layer, chunk);
         transformComponent.chunks.push(chunk);
      }
   }

   // Find all chunks which aren't present in the new chunks and remove them
   for (let i = 0; i < transformComponent.chunks.length; i++) {
      const chunk = transformComponent.chunks[i]
      if (containingChunks.indexOf(chunk) === -1) {
         removeFromChunk(entity, layer, chunk);
         transformComponent.chunks.splice(i, 1);
         i--;
      }
   }
}
   
/** Recalculates the miscellaneous transform-related info to match their position and angle */
export function cleanTransform(node: Hitbox | Entity): void {
   if (typeof node !== "number") {
      const hitbox = node;
      if (hitbox.parent === null) {
         hitbox.box.angle = hitbox.box.relativeAngle;
      } else {
         updateBox(hitbox.box, hitbox.parent.box.position.x, hitbox.parent.box.position.y, hitbox.parent.box.angle);
         // @Cleanup: maybe should be done in the updatebox function?? if it become updateHitbox??
         hitbox.velocity.x = hitbox.parent.velocity.x;
         hitbox.velocity.y = hitbox.parent.velocity.y;
      }
      
      for (const child of node.children) {
         if (entityChildIsHitbox(child)) {
            cleanTransform(child);
         } else {
            cleanTransform(child.attachedEntity);
         }
      }
   } else {
      const entity = node;
      const transformComponent = TransformComponentArray.getComponent(entity);
      
      assert(transformComponent.children.length > 0);
   
      for (const child of transformComponent.rootChildren) {
         if (entityChildIsHitbox(child)) {
            cleanTransform(child);
         } else {
            cleanTransform(child.attachedEntity);
         }
      }
   
      transformComponent.boundingAreaMinX = Number.MAX_SAFE_INTEGER;
      transformComponent.boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
      transformComponent.boundingAreaMinY = Number.MAX_SAFE_INTEGER;
      transformComponent.boundingAreaMaxY = Number.MIN_SAFE_INTEGER;
   
      // An object only changes their chunks if a hitboxes' bounds change chunks.
      let hitboxChunkBoundsHaveChanged = false;
      for (let i = 0; i < transformComponent.children.length; i++) {
         const child = transformComponent.children[i];
         if (entityChildIsEntity(child)) {
            const childTransformComponent = TransformComponentArray.getComponent(child.attachedEntity);
            // We can do this as earlier in the code we guaranteed that all children of the hitbox have their bounding area updated.
            if (childTransformComponent.boundingAreaMinX < transformComponent.boundingAreaMinX) {
               transformComponent.boundingAreaMinX = childTransformComponent.boundingAreaMinX;
            }
            if (childTransformComponent.boundingAreaMaxX < transformComponent.boundingAreaMaxX) {
               transformComponent.boundingAreaMaxX = childTransformComponent.boundingAreaMaxX;
            }
            if (childTransformComponent.boundingAreaMinY < transformComponent.boundingAreaMinY) {
               transformComponent.boundingAreaMinY = childTransformComponent.boundingAreaMinY;
            }
            if (childTransformComponent.boundingAreaMaxY < transformComponent.boundingAreaMaxY) {
               transformComponent.boundingAreaMaxY = childTransformComponent.boundingAreaMaxY;
            }
         } else {
            const hitbox = child;
            const box = hitbox.box;
      
            const boundsMinX = box.calculateBoundsMinX();
            const boundsMaxX = box.calculateBoundsMaxX();
            const boundsMinY = box.calculateBoundsMinY();
            const boundsMaxY = box.calculateBoundsMaxY();
      
            // Update bounding area
            if (boundsMinX < transformComponent.boundingAreaMinX) {
               transformComponent.boundingAreaMinX = boundsMinX;
            }
            if (boundsMaxX > transformComponent.boundingAreaMaxX) {
               transformComponent.boundingAreaMaxX = boundsMaxX;
            }
            if (boundsMinY < transformComponent.boundingAreaMinY) {
               transformComponent.boundingAreaMinY = boundsMinY;
            }
            if (boundsMaxY > transformComponent.boundingAreaMaxY) {
               transformComponent.boundingAreaMaxY = boundsMaxY;
            }
      
            // Check if the hitboxes' chunk bounds have changed
            // @Speed
            // @Speed
            // @Speed
            if (!hitboxChunkBoundsHaveChanged) {
               if (Math.floor(boundsMinX / Settings.CHUNK_UNITS) !== Math.floor(hitbox.boundsMinX / Settings.CHUNK_UNITS) ||
                     Math.floor(boundsMaxX / Settings.CHUNK_UNITS) !== Math.floor(hitbox.boundsMaxX / Settings.CHUNK_UNITS) ||
                     Math.floor(boundsMinY / Settings.CHUNK_UNITS) !== Math.floor(hitbox.boundsMinY / Settings.CHUNK_UNITS) ||
                     Math.floor(boundsMaxY / Settings.CHUNK_UNITS) !== Math.floor(hitbox.boundsMaxY / Settings.CHUNK_UNITS)) {
                  hitboxChunkBoundsHaveChanged = true;
               }
            }
      
            hitbox.boundsMinX = boundsMinX;
            hitbox.boundsMaxX = boundsMaxX;
            hitbox.boundsMinY = boundsMinY;
            hitbox.boundsMaxY = boundsMaxY;
         }
      }
   
      transformComponent.isDirty = false;
   
      if (entity !== null && hitboxChunkBoundsHaveChanged) {
         updateContainingChunks(transformComponent, entity);
      }
   }
}

export const TransformComponentArray = new ComponentArray<TransformComponent>(ServerComponentType.transform, true, getDataLength, addDataToPacket);
TransformComponentArray.onInitialise = onInitialise;
TransformComponentArray.onJoin = onJoin;
TransformComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
TransformComponentArray.preRemove = preRemove;
TransformComponentArray.onRemove = onRemove;

const collideWithVerticalWorldBorder = (transformComponent: TransformComponent, tx: number): void => {
   for (const rootHitbox of transformComponent.children) {
      if (entityChildIsHitbox(rootHitbox)) {
         rootHitbox.box.position.x += tx;
         rootHitbox.velocity.x = 0;
      }
   }

   transformComponent.isDirty = true;
}

const collideWithHorizontalWorldBorder = (transformComponent: TransformComponent, ty: number): void => {
   for (const rootHitbox of transformComponent.children) {
      if (entityChildIsHitbox(rootHitbox)) {
         rootHitbox.box.position.y += ty;
         rootHitbox.velocity.y = 0;
      }
   }

   transformComponent.isDirty = true;
}

export function resolveEntityBorderCollisions(transformComponent: TransformComponent): void {
   // Left border
   if (transformComponent.boundingAreaMinX < 0) {
      collideWithVerticalWorldBorder(transformComponent, -transformComponent.boundingAreaMinX);
      // Right border
   } else if (transformComponent.boundingAreaMaxX > Settings.BOARD_UNITS) {
      collideWithVerticalWorldBorder(transformComponent, Settings.BOARD_UNITS - transformComponent.boundingAreaMaxX);
   }

   // Bottom border
   if (transformComponent.boundingAreaMinY < 0) {
      collideWithHorizontalWorldBorder(transformComponent, -transformComponent.boundingAreaMinY);
      // Top border
   } else if (transformComponent.boundingAreaMaxY > Settings.BOARD_UNITS) {
      collideWithHorizontalWorldBorder(transformComponent, Settings.BOARD_UNITS - transformComponent.boundingAreaMaxY);
   }

   // If the entity is outside the world border after resolving border collisions, throw an error
   for (const hitbox of transformComponent.children) {
      if (entityChildIsHitbox(hitbox)) {
         if (hitbox.box.position.x < 0 || hitbox.box.position.x >= Settings.BOARD_UNITS || hitbox.box.position.y < 0 || hitbox.box.position.y >= Settings.BOARD_UNITS) {
            const entity = TransformComponentArray.getEntityFromComponent(transformComponent);
            throw new Error("Unable to properly resolve border collisions for " + EntityTypeString[getEntityType(entity)] + ".");
         }
      }
   }
}

function onInitialise(config: EntityConfig, entity: Entity): void {
   // This used to be done in the onJoin function, but since entities can now be attached just before the onJoin functions
   // are called, we have to initialise the root entity before that.
   const transformComponent = config.components[ServerComponentType.transform]!;
   if (transformComponent.rootEntity === 0) {
      transformComponent.rootEntity = entity;
   }
}

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   transformComponent.lastValidLayer = getEntityLayer(entity);

   // Update the hitbox tether last positions, in case their positions were changed after creation
   for (const tether of transformComponent.tethers) {
      tether.previousPositionX = tether.hitbox.box.position.x;
      tether.previousPositionY = tether.hitbox.box.position.y;
   }
   
   // @Cleanup: This is so similar to the updatePosition function
   
   cleanTransform(entity);

   resolveEntityBorderCollisions(transformComponent);
   if (transformComponent.isDirty) {
      cleanTransform(entity);
   }

   // Add to chunks
   updateContainingChunks(transformComponent, entity);

   // @Cleanup: should we make a separate PathfindingOccupancyComponent?
   if (entityCanBlockPathfinding(entity)) {
      updateEntityPathfindingNodeOccupance(entity);
   }

   updateEntityLights(entity);
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent.rootEntity === entity) {
      tickEntityPhysics(entity);
   }
}

function preRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Mark any children to be destroyed
   for (const entityAttachInfo of transformComponent.children) {
      if (entityChildIsEntity(entityAttachInfo)) {
         if (entityAttachInfo.destroyWhenParentIsDestroyed) {
            destroyEntity(entityAttachInfo.attachedEntity);
         }
      }
   }
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Remove from parent if attached
   if (entityExists(transformComponent.parentEntity)) {
      removeAttachedEntity(transformComponent.parentEntity, entity);
   }

   // Unattach any children of the entity which aren't being destroyed
   for (const child of transformComponent.children) {
      if (entityChildIsEntity(child) && !child.destroyWhenParentIsDestroyed) {
         removeAttachedEntity(entity, child.attachedEntity);
      }
   }
   
   // Remove from chunks
   const layer = getEntityLayer(entity);
   for (let i = 0; i < transformComponent.chunks.length; i++) {
      const chunk = transformComponent.chunks[i];
      removeFromChunk(entity, layer, chunk);
   }

   // @Cleanup: Same as above. should we make a separate PathfindingOccupancyComponent?
   if (entityCanBlockPathfinding(entity)) {
      clearEntityPathfindingNodes(entity);
   }

   removeEntityLights(entity);
}

const addEntityAttachInfoToPacket = (packet: Packet, attachInfo: EntityAttachInfo): void => {
   packet.addNumber(attachInfo.attachedEntity);

   if (attachInfo.parent !== null) {
      packet.addNumber(attachInfo.parent.localID);
   } else {
      packet.addNumber(-1);
   }
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   packet.addNumber(transformComponent.rootEntity);
   packet.addNumber(transformComponent.parentEntity);
   
   packet.addNumber(transformComponent.collisionBit);
   packet.addNumber(transformComponent.collisionMask);
   
   packet.addNumber(transformComponent.children.length);
   for (const child of transformComponent.children) {
      const nodeType = entityChildIsEntity(child) ? TransformNodeType.entity : TransformNodeType.hitbox;
      packet.addNumber(nodeType);
      
      if (entityChildIsEntity(child)) {
         addEntityAttachInfoToPacket(packet, child);
      } else {
         const hitbox = child;

         addHitboxDataToPacket(packet, hitbox);

         let tether: HitboxTether | undefined;
         for (const currentTether of transformComponent.tethers) {
            if (currentTether.hitbox === hitbox) {
               tether = currentTether;
            }
         }
   
         // Tether data
         if (typeof tether !== "undefined") {
            packet.addBoolean(true);
            packet.padOffset(3);
   
            addHitboxDataToPacket(packet, tether.originHitbox);
            packet.addNumber(tether.idealDistance);
            packet.addNumber(tether.springConstant);
            packet.addNumber(tether.damping);
         } else {
            packet.addBoolean(false);
            packet.padOffset(3);
         }
      }
   }
}

function getDataLength(entity: Entity): number {
   const transformComponent = TransformComponentArray.getComponent(entity);

   let lengthBytes = 5 * Float32Array.BYTES_PER_ELEMENT;
   
   for (const child of transformComponent.children) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;

      if (entityChildIsEntity(child)) {
         lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
      } else {
         const hitbox = child;
         
         lengthBytes += getHitboxDataLength(hitbox);
   
         lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   
         // @Copynpaste
         let tether: HitboxTether | undefined;
         for (const currentTether of transformComponent.tethers) {
            if (currentTether.hitbox === hitbox) {
               tether = currentTether;
            }
         }
   
         if (typeof tether !== "undefined") {
            lengthBytes += getHitboxDataLength(tether.originHitbox);
            lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
         }
      }
   }

   return lengthBytes;
}

const propagateRootEntityChange = (entity: Entity, rootEntity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   transformComponent.rootEntity = rootEntity;
   registerDirtyEntity(entity);
   
   for (const entityAttachInfo of transformComponent.children) {
      if (entityChildIsEntity(entityAttachInfo)) {
         propagateRootEntityChange(entityAttachInfo.attachedEntity, rootEntity);
      }
   }
}

export function attachEntity(entity: Entity, parent: Entity, parentHitbox: Hitbox | null, offsetX: number, offsetY: number, destroyWhenParentIsDestroyed: boolean): void {
   assert(entity !== parent);
   
   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   const parentTransformComponent = TransformComponentArray.getComponent(parent);
   
   entityTransformComponent.rootEntity = parentTransformComponent.rootEntity;
   entityTransformComponent.parentEntity = parent;

   if (parentHitbox !== null) {
      // Attach all root hitboxes to the parent hitbox
      for (const child of entityTransformComponent.rootChildren) {
         if (entityChildIsHitbox(child)) {
            // Note: we don't add the child to the parent's children array as we can't have hitboxes be related between entities.
            child.parent = parentHitbox;
            child.box.offset.x = offsetX;
            child.box.offset.y = offsetY;
         }
      }
   }
   
   const attachInfo: EntityAttachInfo = {
      attachedEntity: entity,
      parent: parentHitbox,
      destroyWhenParentIsDestroyed: destroyWhenParentIsDestroyed
   };
   parentTransformComponent.children.push(attachInfo);

   registerDirtyEntity(entity);
   registerDirtyEntity(parent);
}

// @Copynpaste !
export function attachEntityWithTether(entity: Entity, parent: Entity, parentHitbox: Hitbox | null, idealDistance: number, springConstant: number, damping: number, affectsOriginHitbox: boolean, destroyWhenParentIsDestroyed: boolean): void {
   assert(entity !== parent);
   
   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   const parentTransformComponent = TransformComponentArray.getComponent(parent);
   
   entityTransformComponent.rootEntity = parentTransformComponent.rootEntity;
   entityTransformComponent.parentEntity = parent;

   if (parentHitbox !== null) {
      // Attach all root hitboxes to the parent hitbox
      for (const rootHitbox of entityTransformComponent.rootChildren) {
         if (entityChildIsHitbox(rootHitbox)) {
            entityTransformComponent.addHitboxTether(rootHitbox, parentHitbox, idealDistance, springConstant, damping, affectsOriginHitbox);
         }
      }
   }
   
   const attachInfo: EntityAttachInfo = {
      attachedEntity: entity,
      parent: parentHitbox,
      destroyWhenParentIsDestroyed: destroyWhenParentIsDestroyed
   };
   parentTransformComponent.children.push(attachInfo);

   registerDirtyEntity(entity);
   registerDirtyEntity(parent);
}

export function removeAttachedEntity(parent: Entity, child: Entity): void {
   const parentTransformComponent = TransformComponentArray.getComponent(parent);
   
   let idx: number | undefined;
   let entityAttachInfo: EntityAttachInfo | undefined;
   for (let i = 0; i < parentTransformComponent.children.length; i++) {
      const currentEntityAttachInfo = parentTransformComponent.children[i];
      if (entityChildIsEntity(currentEntityAttachInfo) && currentEntityAttachInfo.attachedEntity === child) {
         idx = i;
         entityAttachInfo = currentEntityAttachInfo;
         break;
      }
   }
   assert(typeof idx !== "undefined" && typeof entityAttachInfo !== "undefined");

   parentTransformComponent.children.splice(idx, 1);

   // Remove from the parent's root children
   const idx2 = parentTransformComponent.rootChildren.indexOf(entityAttachInfo);
   if (idx2 !== -1) {
      parentTransformComponent.rootChildren.splice(idx2, 1);
   }

   // If the parent has no children left, destroy the parent
   if (parentTransformComponent.children.length === 0) {
      destroyEntity(parent);
   }
   
   const childTransformComponent = TransformComponentArray.getComponent(child);
   childTransformComponent.parentEntity = 0;

   // Unset the parent hitbox
   for (const child of childTransformComponent.rootChildren) {
      if (entityChildIsHitbox(child)) {
         child.parent = null;

         // Remove any tethers to the parent hitbox
         for (let i = 0; i < childTransformComponent.tethers.length; i++) {
            const tether = childTransformComponent.tethers[i];
            if (tether.originHitbox === entityAttachInfo.parent) {
               childTransformComponent.tethers.splice(i, 1);
               break;
            }
         }
      }
   }
   
   registerDirtyEntity(parent);
   registerDirtyEntity(child);
   
   propagateRootEntityChange(child, child);
}

export function getRandomPositionInBox(box: Box): Point {
   if (boxIsCircular(box)) {
      return box.position.offset(box.radius * Math.random(), 2 * Math.PI * Math.random());
   } else {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      const x = box.position.x + rotateXAroundOrigin(xOffset, yOffset, box.angle);
      const y = box.position.y + rotateYAroundOrigin(xOffset, yOffset, box.angle);
      return new Point(x, y);
   }
}

const countHitboxes = (transformComponent: TransformComponent): number => {
   let numHitboxes = 0;
   for (const child of transformComponent.children) {
      if (entityChildIsEntity(child)) {
         const childTransformComponent = TransformComponentArray.getComponent(child.attachedEntity);
         numHitboxes += countHitboxes(childTransformComponent);
      } else {
         numHitboxes++;
      }
   } 
   return numHitboxes;
}

const getHeirarchyIndexedHitbox = (transformComponent: TransformComponent, i: number, hitboxIdx: number): Hitbox | number => {
   let newI = i;
   for (const child of transformComponent.children) {
      if (entityChildIsEntity(child)) {
         const childTransformComponent = TransformComponentArray.getComponent(child.attachedEntity);
         const result = getHeirarchyIndexedHitbox(childTransformComponent, newI, hitboxIdx);
         if (typeof result === "number") {
            newI = result;
         } else {
            return result;
         }
      } else {
         if (newI === hitboxIdx) {
            return child;
         }
         
         newI++;
      }
   } 
   return newI;
}

export function getRandomPositionInEntity(transformComponent: TransformComponent): Point {
   const numHitboxes = countHitboxes(transformComponent);
   const hitboxIdx = Math.floor(Math.random() * numHitboxes);
   
   const hitbox = getHeirarchyIndexedHitbox(transformComponent, 0, hitboxIdx);
   if (typeof hitbox === "number") {
      throw new Error();
   }
   return getRandomPositionInBox(hitbox.box);
}

export function changeEntityLayer(entity: Entity, newLayer: Layer): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // Remove from previous chunks
   const previousLayer = getEntityLayer(entity);
   while (transformComponent.chunks.length > 0) {
      const chunk = transformComponent.chunks[0];
      removeFromChunk(entity, previousLayer, chunk);
      transformComponent.chunks.splice(0, 1);
   }

   // Add to the new ones
   // @Cleanup: this logic should be in transformcomponent, perhaps there is a function which already does this...
   const minChunkX = Math.max(Math.floor(transformComponent.boundingAreaMinX / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor(transformComponent.boundingAreaMaxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor(transformComponent.boundingAreaMinY / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor(transformComponent.boundingAreaMaxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const newChunk = newLayer.getChunk(chunkX, chunkY);
         addToChunk(entity, newLayer, newChunk);
         transformComponent.chunks.push(newChunk);
      }
   }

   setEntityLayer(entity, newLayer);
}

// @Hacky
/** For a given entity, gets the first component up its entity tree. Returns null if none was found. */
export function getFirstEntityWithComponent<T extends object>(componentArray: ComponentArray<T>, entity: Entity): Entity | null {
   if (componentArray.hasComponent(entity)) {
      return entity;
   }
   
   // Check root entity
   // @Hack?
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent.rootEntity !== entity && componentArray.hasComponent(transformComponent.rootEntity)) {
      return transformComponent.rootEntity;
   }

   return null;
}

// @Copynpaste
/** For a given entity, gets the first component up its entity tree. Returns null if none was found. */
export function getFirstComponent<T extends object>(componentArray: ComponentArray<T>, entity: Entity): T {
   if (componentArray.hasComponent(entity)) {
      return componentArray.getComponent(entity);
   }
   
   // Check root entity
   // @Hack?
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent.rootEntity !== entity && componentArray.hasComponent(transformComponent.rootEntity)) {
      return componentArray.getComponent(transformComponent.rootEntity);
   }

   throw new Error();
}

export function entityTreeHasComponent(componentArray: ComponentArray, entity: Entity): boolean {
   if (componentArray.hasComponent(entity)) {
      return true;
   }
   
   // Check root entity
   // @Hack?
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent.rootEntity !== entity && componentArray.hasComponent(transformComponent.rootEntity)) {
      return true;
   }

   return false;
}

export function getRootEntity(entity: Entity): Entity {
   const transformComponent = TransformComponentArray.getComponent(entity);
   return transformComponent.rootEntity;
}

/** Attempts to return the first hitbox which can be found in the transform component or any of its parents */
export function getTransformComponentFirstHitbox(transformComponent: TransformComponent): Hitbox | null {
   for (const child of transformComponent.children) {
      if (entityChildIsEntity(child)) {
         const childTransformComponent = TransformComponentArray.getComponent(child.attachedEntity);
         const childFirstHitbox = getTransformComponentFirstHitbox(childTransformComponent);
         if (childFirstHitbox !== null) {
            return childFirstHitbox;
         }
      } else {
         return child;
      }
   }

   return null;
}