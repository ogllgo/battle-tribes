import { PathfindingNodeIndex } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { getEntityCollisionGroup } from "battletribes-shared/collision-groups";
import { assert, Point, randAngle, randFloat, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import Layer from "../Layer";
import Chunk from "../Chunk";
import { Entity, EntityType, EntityTypeString } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { AIHelperComponentArray, entityIsNoticedByAI } from "./AIHelperComponent";
import { tickEntityPhysics } from "./PhysicsComponent";
import { clearEntityPathfindingNodes, entityCanBlockPathfinding, updateEntityPathfindingNodeOccupance } from "../pathfinding";
import { resolveWallCollision } from "../collision-resolution";
import { Packet } from "battletribes-shared/packets";
import { Box, boxIsCircular, getBoxArea, HitboxFlag, updateBox } from "battletribes-shared/boxes/boxes";
import { destroyEntity, getEntityLayer, getEntityType, setEntityLayer } from "../world";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { removeEntityLights, updateEntityLights } from "../lights";
import { registerDirtyEntity } from "../server/player-clients";
import { surfaceLayer } from "../layers";
import { addHitboxDataToPacket, getHitboxDataLength } from "../server/packet-hitboxes";
import { getHitboxVelocity, getRootHitbox, Hitbox, setHitboxVelocity, setHitboxVelocityX, setHitboxVelocityY, translateHitbox } from "../hitboxes";
import { EntityConfig } from "../components";
import { addEntityTethersToWorld, destroyTether as destroyTether } from "../tethers";

// @Cleanup: move mass/hitbox related stuff out? (Are there any entities which could take advantage of that extraction?)

export class TransformComponent {
   // @Speed: may want to re-introduce the totalMass property
   
   // @Cleanup: unused?
   public collisionPushForceMultiplier = 1;
 
   /** All chunks the entity is contained in */
   public readonly chunks = new Array<Chunk>();
   
   /** All hitboxes attached to the entity */
   public readonly hitboxes = new Array<Hitbox>();
   /** Hitboxes not attached to any hitbox interal to the same entity. Root hitboxes can either be hitboxes with no parent, or hitboxes with a different entity's hitbox as a parent. */
   public readonly rootHitboxes = new Array<Hitbox>();

   // // @Speed: mix and matching 2 types is very bad for performance. Is there some architecture which won't do this?
   // // @Robustness: also having it be one or the other can easily introduce bugs where you assume it's one or the other. Should completely remove that architecturally
   // /** All children attached to the entity */
   // public readonly children = new Array<TransformNode>();
   // /** Children not attached to any hitbox interal to the same entity. Root children can either be children with no parent, or children with a different entity's hitbox as a parent. */
   // public readonly rootChildren = new Array<TransformNode>();
   
   public boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   public boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   /** Whether the entities' position/angle/hitboxes have changed during the current tick or not. */
   public isDirty = false;

   public pathfindingNodesAreDirty = false;
   
   public lastValidLayer = surfaceLayer;

   public collisionBit = CollisionBit.default;
   public collisionMask = DEFAULT_COLLISION_MASK;
   
   public occupiedPathfindingNodes = new Set<PathfindingNodeIndex>();

   public nextHitboxLocalID = 1;

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
      
      for (const hitbox of this.hitboxes) {
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
   transformComponent.hitboxes.push(hitbox);
   if (hitbox.parent === null) {
      transformComponent.rootHitboxes.push(hitbox);
   } else {
      assert(!hitbox.parent.children.includes(hitbox));
      hitbox.parent.children.push(hitbox);
   }
}

/** Should only be called after an entity is created */
export function addHitboxToEntity(entity: Entity, hitbox: Hitbox): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   transformComponent.hitboxes.push(hitbox);
   if (hitbox.parent === null) {
      transformComponent.rootHitboxes.push(hitbox);
   } else {
      assert(!hitbox.parent.children.includes(hitbox));
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
      cleanEntityTransform(entity);
   }
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
   for (const hitbox of transformComponent.hitboxes) {
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
   
/** Recalculates the miscellaneous transform-related info to match the hitbox's position and angle */
const cleanHitboxTransformIncludingChildren = (hitbox: Hitbox): void => {
   if (hitbox.parent === null) {
      hitbox.box.angle = hitbox.box.relativeAngle;
   } else {
      updateBox(hitbox.box, hitbox.parent.box);
      // @Cleanup: maybe should be done in the updatebox function?? if it become updateHitbox??
      const parentVelocity = getHitboxVelocity(hitbox.parent);
      setHitboxVelocity(hitbox, parentVelocity.x, parentVelocity.y);
   }
   
   const transformComponent = TransformComponentArray.getComponent(hitbox.entity);

   // @SPEED: Pretty sure this is going to override itself many many times!! should only be done 1nce per entity
   // @CLEANUP: Its kind of implied that the function doesn't do this, jsut does the hitbox stuff!!!!!
   
   // An object only changes their chunks if a hitboxes' bounds change chunks.
   let hitboxChunkBoundsHaveChanged = false;
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
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

   transformComponent.isDirty = false;

   if (hitboxChunkBoundsHaveChanged) {
      updateContainingChunks(transformComponent, hitbox.entity);
   }

   registerDirtyEntity(hitbox.entity);

   for (const childHitbox of hitbox.children) {
      cleanHitboxTransformIncludingChildren(childHitbox);
   }
}

export function cleanEntityTransform(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   assert(transformComponent.hitboxes.length > 0);

   for (const rootHitbox of transformComponent.rootHitboxes) {
      cleanHitboxTransformIncludingChildren(rootHitbox);
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

const collideWithVerticalWorldBorder = (hitbox: Hitbox, transformComponent: TransformComponent, tx: number): void => {
   const rootHitbox = getRootHitbox(hitbox);
   translateHitbox(rootHitbox, transformComponent, new Point(tx, 0));
   setHitboxVelocityX(rootHitbox, 0);
}

const collideWithHorizontalWorldBorder = (hitbox: Hitbox, transformComponent: TransformComponent, ty: number): void => {
   const rootHitbox = getRootHitbox(hitbox);
   translateHitbox(rootHitbox, transformComponent, new Point(0, ty));
   setHitboxVelocityY(rootHitbox, 0);
}

export function resolveEntityBorderCollisions(transformComponent: TransformComponent): void {
   const EPSILON = 0.0001;
   
   for (const hitbox of transformComponent.hitboxes) {
      let hasCorrected = false;
      
      // Left border
      const minX = hitbox.box.calculateBoundsMinX();
      if (minX < 0) {
         collideWithVerticalWorldBorder(hitbox, transformComponent, -minX + EPSILON);
         hasCorrected = true;
      }

      // Right border
      const maxX = hitbox.box.calculateBoundsMaxX();
      if (maxX > Settings.BOARD_UNITS) {
         collideWithVerticalWorldBorder(hitbox, transformComponent, Settings.BOARD_UNITS - maxX - EPSILON);
         hasCorrected = true;
      }

      // Bottom border
      const minY = hitbox.box.calculateBoundsMinY();
      if (minY < 0) {
         hasCorrected = true;
         collideWithHorizontalWorldBorder(hitbox, transformComponent, -minY + EPSILON);
      }

      // Top border
      const maxY = hitbox.box.calculateBoundsMaxY();
      if (maxY > Settings.BOARD_UNITS) {
         hasCorrected = true;
         collideWithHorizontalWorldBorder(hitbox, transformComponent, Settings.BOARD_UNITS - maxY - EPSILON);
      }

      // We then need to clean the hitbox so that its children have its position updated to reflect the move
      if (hasCorrected) {
         // @SPEED if we're doing this then shouldn't we do the root hitbox recursion thing??
         const rootHitbox = getRootHitbox(hitbox);
         cleanHitboxTransformIncludingChildren(rootHitbox);
      }
   }

   // If the entity is outside the world border after resolving border collisions, throw an error
   // @Robustness this should be impossible to trigger
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.box.position.x < 0 || hitbox.box.position.x >= Settings.BOARD_UNITS || hitbox.box.position.y < 0 || hitbox.box.position.y >= Settings.BOARD_UNITS) {
         const entity = TransformComponentArray.getEntityFromComponentNONOSQUARE(transformComponent);
         throw new Error("Unable to properly resolve border collisions for " + EntityTypeString[getEntityType(entity)] + ".");
      }
   }
}

function onInitialise(config: EntityConfig, entity: Entity): void {
   // This used to be done in the onJoin function, but since entities can now be attached just before the onJoin functions
   // are called, we have to initialise the root entity before that.
   const transformComponent = config.components[ServerComponentType.transform]!;
   for (const hitbox of transformComponent.hitboxes) {
      hitbox.entity = entity;
      if (hitbox.rootEntity === 0) {
         hitbox.rootEntity = entity;
      }
   }
}

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   transformComponent.lastValidLayer = getEntityLayer(entity);
   
   // @Cleanup: This is so similar to the updatePosition function
   
   cleanEntityTransform(entity);

   resolveEntityBorderCollisions(transformComponent);
   if (transformComponent.isDirty) {
      cleanEntityTransform(entity);
   }

   updateContainingChunks(transformComponent, entity);

   // @Cleanup: should we make a separate PathfindingOccupancyComponent?
   if (entityCanBlockPathfinding(entity)) {
      updateEntityPathfindingNodeOccupance(entity);
   }

   updateEntityLights(entity);

   addEntityTethersToWorld(transformComponent);
}

function onTick(entity: Entity): void {
   tickEntityPhysics(entity);
}

function preRemove(entity: Entity): void {
   // Destroy all sub-parts
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (const hitbox of transformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (childHitbox.isPartOfParent) {
            destroyEntity(childHitbox.entity);
         }
      }
   }
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (const hitbox of transformComponent.hitboxes) {
      // Detach any of the entities' hitboxes which are attached to another entities' hitbox
      if (hitbox.parent !== null && hitbox.parent.entity !== entity) {
         detachHitbox(hitbox);
      }

      // Untether
      while (hitbox.tethers.length > 0) {
         const tether = hitbox.tethers[0];
         destroyTether(tether);
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

function addDataToPacket(packet: Packet, entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   packet.addNumber(transformComponent.collisionBit);
   packet.addNumber(transformComponent.collisionMask);
   
   packet.addNumber(transformComponent.hitboxes.length);
   for (const hitbox of transformComponent.hitboxes) {
      addHitboxDataToPacket(packet, hitbox);
   }
}

function getDataLength(entity: Entity): number {
   const transformComponent = TransformComponentArray.getComponent(entity);

   let lengthBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
   
   for (const hitbox of transformComponent.hitboxes) {
      lengthBytes += getHitboxDataLength(hitbox);
   }

   return lengthBytes;
}

const propagateRootEntityChange = (hitbox: Hitbox, rootEntity: Entity): void => {
   hitbox.rootEntity = rootEntity;
   registerDirtyEntity(hitbox.entity);
   
   for (const childHitbox of hitbox.children) {
      propagateRootEntityChange(childHitbox, rootEntity);
   }
}

export function attachHitboxRaw(hitbox: Hitbox, parentHitbox: Hitbox, isPartOfParent: boolean): void {
   assert(hitbox.rootEntity !== parentHitbox.rootEntity);
   
   hitbox.rootEntity = parentHitbox.rootEntity;
   hitbox.parent = parentHitbox;
   hitbox.isPartOfParent = isPartOfParent;
   assert(!hitbox.parent.children.includes(hitbox));
   hitbox.parent.children.push(hitbox);
   
   registerDirtyEntity(hitbox.entity);
   registerDirtyEntity(parentHitbox.entity);
}

export function attachHitbox(hitbox: Hitbox, parentHitbox: Hitbox, isPartOfParent: boolean): void {
   attachHitboxRaw(hitbox, parentHitbox, isPartOfParent);
   
   // Once the entity gets attached, it's going to have the parent hitboxes' angle added to it, so subtract it now.
   // Adjust the child's relative rotation so that it stays pointed in the same direction relative to the parent
   hitbox.box.relativeAngle -= parentHitbox.box.angle;
   hitbox.previousRelativeAngle -= parentHitbox.box.angle;

   const diffX = hitbox.box.position.x - parentHitbox.box.position.x;
   const diffY = hitbox.box.position.y - parentHitbox.box.position.y;

   hitbox.box.offset.x = rotateXAroundOrigin(diffX, diffY, -parentHitbox.box.angle);
   hitbox.box.offset.y = rotateYAroundOrigin(diffX, diffY, -parentHitbox.box.angle);

   const parentVelocity = getHitboxVelocity(parentHitbox);
   setHitboxVelocity(hitbox, parentVelocity.x, parentVelocity.y);

   // Any acceleration applied to this hitbox will instead be applied to the root hitbox
   hitbox.acceleration.x = 0;
   hitbox.acceleration.y = 0;
}

// @Copynpaste !
export function attachEntityWithTether(entity: Entity, parent: Entity, parentHitbox: Hitbox | null, idealDistance: number, springConstant: number, damping: number, destroyWhenParentIsDestroyed: boolean): void {
   assert(entity !== parent);

   throw new Error();
   
   // @INCOMPLETE

   // const entityTransformComponent = TransformComponentArray.getComponent(entity);
   // const parentTransformComponent = TransformComponentArray.getComponent(parent);
   
   // entityTransformComponent.rootEntity = parentTransformComponent.rootEntity;
   // entityTransformComponent.parentEntity = parent;

   // if (parentHitbox !== null) {
   //    if (entityTransformComponent.rootChildren.length > 1) {
   //       // don't want the same angular tether to be referenced in multiple hitboxes.
   //       throw new Error();
   //    }
   //    // Attach all root hitboxes to the parent hitbox
   //    for (const rootHitbox of entityTransformComponent.rootChildren) {
   //       if (entityChildIsHitbox(rootHitbox)) {
   //          // Note: we don't add the child to the parent's children array as we can't have hitboxes be related between entities.

   //          // Don't set 'rootHitbox.parent = parentHitbox' as that would imply that the 
   //          rootHitbox.parent = parentHitbox;

   //          // @Incomplete: why don't we set the offset here like in the non-tether function??

   //          // @Incomplete !
   //          tetherHitboxes(rootHitbox, parentHitbox, entityTransformComponent, parentTransformComponent, idealDistance, springConstant, damping);
   //       }
   //    }
   // }
   
   // const attachInfo: EntityAttachInfo = {
   //    attachedEntity: entity,
   //    parentHitbox: parentHitbox,
   //    destroyWhenParentIsDestroyed: destroyWhenParentIsDestroyed
   // };
   // parentTransformComponent.children.push(attachInfo);

   // registerDirtyEntity(entity);
   // registerDirtyEntity(parent);
}

/** Detatches a hitbox from its parent. */
export function detachHitbox(hitbox: Hitbox): void {
   if (hitbox.parent === null) {
      return;
   }

   // Make sure that the hitbox hasn't accumulated any acceleration before it's detached
   assert(hitbox.acceleration.x === 0 && hitbox.acceleration.y === 0)

   const idx = hitbox.parent.children.indexOf(hitbox);
   assert(idx !== -1);
   hitbox.parent.children.splice(idx, 1);
            
   hitbox.box.relativeAngle += hitbox.parent.box.angle;
   hitbox.previousRelativeAngle += hitbox.parent.box.angle;

   // Remove any tethers to the parent hitbox
   for (let i = hitbox.tethers.length - 1; i >= 0; i--) {
      const tether = hitbox.tethers[i];
      const otherHitbox = tether.getOtherHitbox(hitbox);
      if (otherHitbox === hitbox.parent) {
         destroyTether(tether);
         break;
      }
   }

   registerDirtyEntity(hitbox.parent.entity);
   registerDirtyEntity(hitbox.entity);

   hitbox.parent = null;
   propagateRootEntityChange(hitbox, hitbox.entity);
}

export function getRandomPositionInBox(box: Box): Point {
   if (boxIsCircular(box)) {
      return box.position.offset(box.radius * Math.random(), randAngle());
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

// const countHitboxes = (transformComponent: TransformComponent): number => {
//    let numHitboxes = 0;
//    for (const child of transformComponent.children) {
//       if (entityChildIsEntity(child)) {
//       } else {
//          numHitboxes++;
//       }
//    } 
//    return numHitboxes;
// }

// const getHeirarchyIndexedHitbox = (transformComponent: TransformComponent, i: number, hitboxIdx: number): Hitbox | number => {
//    let newI = i;
//    for (const child of transformComponent.children) {
//       if (entityChildIsEntity(child)) {
//          if (typeof result === "number") {
//             newI = result;
//          } else {
//             return result;
//          }
//       } else {
//          if (newI === hitboxIdx) {
//             return child;
//          }
         
//          newI++;
//       }
//    } 
//    return newI;
// }

const getOwnedHitboxArea = (hitbox: Hitbox): number => {
   let area = getBoxArea(hitbox.box);

   for (const childHitbox of hitbox.children) {
      if (childHitbox.isPartOfParent) {
         area += getBoxArea(childHitbox.box);
      }
   }

   return area;
}

const getTotalEntityArea = (transformComponent: TransformComponent): number => {
   let area = 0;
   for (const rootHitbox of transformComponent.rootHitboxes) {
      area += getOwnedHitboxArea(rootHitbox);
   }
   return area;
}

const getWeightedHitbox = (hitbox: Hitbox, currentArea: number, targetArea: number): Hitbox | number => {
   let area = currentArea;

   area += getBoxArea(hitbox.box);
   if (area >= targetArea) {
      return hitbox;
   }

   for (const childHitbox of hitbox.children) {
      if (childHitbox.isPartOfParent) {
         const result = getWeightedHitbox(childHitbox, area, targetArea);
         if (typeof result === "number") {
            area = result;
         } else {
            return result;
         }
      }
   }

   return area;
}

const getEntityWeightedHitbox = (transformComponent: TransformComponent, targetArea: number): Hitbox => {
   let area = 0;

   for (const rootHitbox of transformComponent.rootHitboxes) {
      const result = getWeightedHitbox(rootHitbox, area, targetArea);
      if (typeof result === "number") {
         area = result;
      } else {
         return result;
      }
   }

   throw new Error();
}

export function getRandomWeightedHitbox(transformComponent: TransformComponent): Hitbox {
   const targetWeight = Math.random() * getTotalEntityArea(transformComponent);
   return getEntityWeightedHitbox(transformComponent, targetWeight);
}

export function getRandomPositionInEntity(transformComponent: TransformComponent): Point {
   const hitbox = getRandomWeightedHitbox(transformComponent);
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