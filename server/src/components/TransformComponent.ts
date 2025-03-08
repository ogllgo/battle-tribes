import { PathfindingNodeIndex, RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { getEntityCollisionGroup } from "battletribes-shared/collision-groups";
import { assert, getTileIndexIncludingEdges, Point, randFloat, randInt, rotateXAroundOrigin, rotateYAroundOrigin, TileIndex } from "battletribes-shared/utils";
import Layer from "../Layer";
import Chunk from "../Chunk";
import { Entity, EntityTypeString } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { AIHelperComponentArray, entityIsNoticedByAI } from "./AIHelperComponent";
import { TileType } from "battletribes-shared/tiles";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { clearEntityPathfindingNodes, entityCanBlockPathfinding, updateEntityPathfindingNodeOccupance } from "../pathfinding";
import { resolveWallCollision } from "../collision-resolution";
import { Packet } from "battletribes-shared/packets";
import { Box, boxIsCircular, HitboxFlag, updateBox } from "battletribes-shared/boxes/boxes";
import { destroyEntity, entityExists, getEntityLayer, getEntityType } from "../world";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { removeEntityLights, updateEntityLights } from "../light-levels";
import { registerDirtyEntity } from "../server/player-clients";
import { surfaceLayer } from "../layers";
import { addHitboxDataToPacket, getHitboxDataLength } from "../server/packet-hitboxes";
import { Hitbox } from "../hitboxes";

interface HitboxTether {
   readonly hitbox: Hitbox;
   /** If null, the tether is between the same entity */
   readonly otherEntity: Entity | null;
   readonly otherHitbox: Hitbox;
   
   readonly idealDistance: number;
   readonly springConstant: number;
   readonly damping: number;

   // Used for verlet integration
   previousPositionX: number;
   previousPositionY: number;
}

export interface EntityCarryInfo {
   readonly carriedEntity: Entity;
   readonly offsetX: number;
   readonly offsetY: number;
   /** If true, when the carried entities' mount is destroyed, the carried entity will be destroyed instead of being dismounted */
   readonly destroyWhenMountIsDestroyed: boolean;
}

// @Cleanup: move mass/hitbox related stuff out? (Are there any entities which could take advantage of that extraction?)

export class TransformComponent {
   // @Speed: may want to re-introduce the totalMass property
   
   // @Cleanup: unused?
   public collisionPushForceMultiplier = 1;

   /** All chunks the entity is contained in */
   public readonly chunks = new Array<Chunk>();

   public isInRiver = false;

   /** All hitboxes attached to the entity */
   public hitboxes = new Array<Hitbox>();
   /** Hitboxes with no parent */
   public readonly rootHitboxes = new Array<Hitbox>();

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

   /** The entity at the bottom of the carry chain. */
   public carryRoot: Entity = 0;
   /** The entity carrying it. (Or 0 if it isn't being carried) */
   public mount: Entity;
   public carriedEntities = new Array<EntityCarryInfo>();

   public rootEntity: Entity = 0;
   public readonly childEntities = new Array<Entity>();

   constructor(mount: Entity) {
      this.mount = mount;
   }

   public updateIsInRiver(entity: Entity): void {
      const tileIndex = getEntityTile(this);
      const layer = getEntityLayer(entity);
      
      const tileType = layer.tileTypes[tileIndex];
      if (tileType !== TileType.water) {
         this.isInRiver = false;
         return;
      }

      if (PhysicsComponentArray.hasComponent(entity)) {
         const physicsComponent = PhysicsComponentArray.getComponent(entity);
         if (!physicsComponent.isAffectedByGroundFriction) {
            this.isInRiver = false;
            return;
         }
      }

      // If the game object is standing on a stepping stone they aren't in a river
      // @Hack
      const hitbox = this.hitboxes[0];
      for (const chunk of this.chunks) {
         for (const steppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
            
            const distX = hitbox.box.position.x - steppingStone.positionX;
            const distY = hitbox.box.position.y - steppingStone.positionY;
            if (distX * distX + distY * distY <= size * size / 4) {
               this.isInRiver = false;
               return;
            }
         }
      }

      this.isInRiver = true;
   }

   public addHitboxTether(hitbox: Hitbox, otherEntity: Entity | null, otherHitbox: Hitbox, idealDistance: number, springConstant: number, damping: number): void {
      const tether: HitboxTether = {
         hitbox: hitbox,
         otherEntity: otherEntity,
         otherHitbox: otherHitbox,
         idealDistance: idealDistance,
         springConstant: springConstant,
         damping: damping,
         previousPositionX: hitbox.box.position.x,
         previousPositionY: hitbox.box.position.y
      };
      this.tethers.push(tether);
   }

   // @Cleanup: is there a way to avoid having this be optionally null? Or having the entity parameter here entirely?
   // Note: entity is null if the hitbox hasn't been created yet
   public addHitbox(hitbox: Hitbox, entity: Entity | null): void {
      this.hitboxes.push(hitbox);
      if (hitbox.parent === null) {
         this.rootHitboxes.push(hitbox);
      }

      // Only update the transform stuff if the entity is created, as if it isn't created then the position of the entity will just be 0,0 (default).
      if (entity !== null) {
         const box = hitbox.box;
         if (hitbox.parent !== null) {
            const parentBox = hitbox.parent.box;
            updateBox(box, parentBox.position.x, parentBox.position.y, parentBox.angle);
         }
      
         const boundsMinX = box.calculateBoundsMinX();
         const boundsMaxX = box.calculateBoundsMaxX();
         const boundsMinY = box.calculateBoundsMinY();
         const boundsMaxY = box.calculateBoundsMaxY();
      
         // Update bounding area
         if (boundsMinX < this.boundingAreaMinX) {
            this.boundingAreaMinX = boundsMinX;
         }
         if (boundsMaxX > this.boundingAreaMaxX) {
            this.boundingAreaMaxX = boundsMaxX;
         }
         if (boundsMinY < this.boundingAreaMinY) {
            this.boundingAreaMinY = boundsMinY;
         }
         if (boundsMaxY > this.boundingAreaMaxY) {
            this.boundingAreaMaxY = boundsMaxY;
         }
      
         // If the hitbox is clipping into a border, clean the entities' position so that it doesn't clip
         if (boundsMinX < 0 || boundsMaxX >= Settings.BOARD_UNITS || boundsMinY < 0 || boundsMaxY >= Settings.BOARD_UNITS) {
            this.cleanHitboxes(entity);
         }
      }
   }

   public addHitboxes(hitboxes: ReadonlyArray<Hitbox>, entity: Entity | null): void {
      for (let i = 0; i < hitboxes.length; i++) {
         const hitbox = hitboxes[i];
         this.addHitbox(hitbox, entity);
      }
   }
   
   /** Recalculates the entities' miscellaneous transforms stuff to match their position and angle */
   public cleanHitboxes(entity: Entity): void {
      // @Temporary?
      // assert(this.hitboxes.length > 0);
      if (this.hitboxes.length === 0) {
         return;
      }

      for (const hitbox of this.rootHitboxes) {
         updateRootHitbox(hitbox);
      }

      this.boundingAreaMinX = Number.MAX_SAFE_INTEGER;
      this.boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
      this.boundingAreaMinY = Number.MAX_SAFE_INTEGER;
      this.boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

      // An object only changes their chunks if a hitboxes' bounds change chunks.
      let hitboxChunkBoundsHaveChanged = false;
      const numHitboxes = this.hitboxes.length;
      for (let i = 0; i < numHitboxes; i++) {
         const hitbox = this.hitboxes[i];
         const box = hitbox.box;

         const boundsMinX = box.calculateBoundsMinX();
         const boundsMaxX = box.calculateBoundsMaxX();
         const boundsMinY = box.calculateBoundsMinY();
         const boundsMaxY = box.calculateBoundsMaxY();

         // Update bounding area
         if (boundsMinX < this.boundingAreaMinX) {
            this.boundingAreaMinX = boundsMinX;
         }
         if (boundsMaxX > this.boundingAreaMaxX) {
            this.boundingAreaMaxX = boundsMaxX;
         }
         if (boundsMinY < this.boundingAreaMinY) {
            this.boundingAreaMinY = boundsMinY;
         }
         if (boundsMaxY > this.boundingAreaMaxY) {
            this.boundingAreaMaxY = boundsMaxY;
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

      if (entity !== null && hitboxChunkBoundsHaveChanged) {
         this.updateContainingChunks(entity);
      }
   }

   public updateContainingChunks(entity: Entity): void {
      const layer = getEntityLayer(entity);
      
      // Calculate containing chunks
      const containingChunks = new Array<Chunk>();
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];
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
         if (this.chunks.indexOf(chunk) === -1) {
            this.addToChunk(entity, layer, chunk);
            this.chunks.push(chunk);
         }
      }
   
      // Find all chunks which aren't present in the new chunks and remove them
      for (let i = 0; i < this.chunks.length; i++) {
         const chunk = this.chunks[i]
         if (containingChunks.indexOf(chunk) === -1) {
            this.removeFromChunk(entity, layer, chunk);
            this.chunks.splice(i, 1);
            i--;
         }
      }
   }

   public addToChunk(entity: Entity, layer: Layer, chunk: Chunk): void {
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
   
   public removeFromChunk(entity: Entity, layer: Layer, chunk: Chunk): void {
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
      
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];
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

const updateAttachedHitboxRecursively = (hitbox: Hitbox): void => {
   const parent = hitbox.parent;
   assert(parent !== null);
   updateBox(hitbox.box, parent.box.position.x, parent.box.position.y, parent.box.angle);
   
   hitbox.velocity.x = parent.velocity.x;
   hitbox.velocity.y = parent.velocity.y;

   for (const childHitbox of hitbox.children) {
      updateAttachedHitboxRecursively(childHitbox);
   }
}

const updateRootHitbox = (hitbox: Hitbox): void => {
   // For root hitboxes, they have no parent so we just set their angle to their relative angle
   // @INCOMPLETE: Does this account for entities being carried??
   // - If i make it so that carrying just attaches the hitbox to the other entities' hitboxes, then it does.
   hitbox.box.angle = hitbox.box.relativeAngle;
   
   for (const attachedHitbox of hitbox.children) {
      updateAttachedHitboxRecursively(attachedHitbox);
   }
}

export const TransformComponentArray = new ComponentArray<TransformComponent>(ServerComponentType.transform, true, getDataLength, addDataToPacket);
TransformComponentArray.onJoin = onJoin;
TransformComponentArray.preRemove = preRemove;
TransformComponentArray.onRemove = onRemove;

export function resolveEntityBorderCollisions(transformComponent: TransformComponent): void {
   // @Hack This will crash IMMEDIATELY
   const rootHitbox = transformComponent.hitboxes[0];
   
   // Left border
   if (transformComponent.boundingAreaMinX < 0) {
      rootHitbox.box.position.x -= transformComponent.boundingAreaMinX;
      rootHitbox.velocity.x = 0;
      transformComponent.isDirty = true;
      // Right border
   } else if (transformComponent.boundingAreaMaxX > Settings.BOARD_UNITS) {
      rootHitbox.box.position.x -= transformComponent.boundingAreaMaxX - Settings.BOARD_UNITS;
      rootHitbox.velocity.x = 0;
      transformComponent.isDirty = true;
   }

   // Bottom border
   if (transformComponent.boundingAreaMinY < 0) {
      rootHitbox.box.position.y -= transformComponent.boundingAreaMinY;
      rootHitbox.velocity.y = 0;
      transformComponent.isDirty = true;
      // Top border
   } else if (transformComponent.boundingAreaMaxY > Settings.BOARD_UNITS) {
      rootHitbox.box.position.y -= transformComponent.boundingAreaMaxY - Settings.BOARD_UNITS;
      rootHitbox.velocity.y = 0;
      transformComponent.isDirty = true;
   }

   // If the entity is outside the world border after resolving border collisions, throw an error
   if (rootHitbox.box.position.x < 0 || rootHitbox.box.position.x >= Settings.BOARD_UNITS || rootHitbox.box.position.y < 0 || rootHitbox.box.position.y >= Settings.BOARD_UNITS) {
      const entity = TransformComponentArray.getEntityFromComponent(transformComponent);
      throw new Error("Unable to properly resolve border collisions for " + EntityTypeString[getEntityType(entity)] + ".");
   }
}

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   if (transformComponent.rootEntity === 0) {
      transformComponent.rootEntity = entity;
   } else if (transformComponent.rootEntity !== entity) {
      const rootEntityTransformComponent = TransformComponentArray.getComponent(transformComponent.rootEntity);
      rootEntityTransformComponent.childEntities.push(entity);
   }
   
   transformComponent.lastValidLayer = getEntityLayer(entity);

   if (transformComponent.mount !== 0) {
      attachEntityToHost(entity, transformComponent.mount, 0, 0, true);
   } else {
      transformComponent.carryRoot = entity;
   }

   // @Incomplete
   // transformComponent.rotation = transformComponent.relativeRotation;
   // if (transformComponent.carryRoot !== entity) {
   //    const carryRootTransformComponent = TransformComponentArray.getComponent(transformComponent.carryRoot);
   //    transformComponent.rotation += carryRootTransformComponent.rotation;
   // }

   // Add hitboxes to their parents' children
   // We do this here instead of when the hitboxes are first added, so that hitboxes of entities which aren't added to the board yet can't be accessed.
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.parent !== null) {
         hitbox.parent.children.push(hitbox);
      }
   }

   // Update the hitbox tether last positions, in case their positions were changed after creation
   for (const tether of transformComponent.tethers) {
      tether.previousPositionX = tether.hitbox.box.position.x;
      tether.previousPositionY = tether.hitbox.box.position.y;
   }
   
   // @Cleanup: This is so siliar to the updatePosition function
   
   // Hitboxes added before the entity joined the world haven't affected the transform yet, so we update them now
   transformComponent.cleanHitboxes(entity);

   // @HACK: the glurb parent entity can have 0 hitboxes!
   if (transformComponent.hitboxes.length !== 0) {
      resolveEntityBorderCollisions(transformComponent);

      if (transformComponent.isDirty) {
         transformComponent.cleanHitboxes(entity);
      }
   
      transformComponent.updateIsInRiver(entity);
      
      // Add to chunks
      transformComponent.updateContainingChunks(entity);
   
      // @Cleanup: should we make a separate PathfindingOccupancyComponent?
      if (entityCanBlockPathfinding(entity)) {
         updateEntityPathfindingNodeOccupance(entity);
      }
   
      updateEntityLights(entity);
   }
}

function preRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (const childEntity of transformComponent.childEntities) {
      destroyEntity(childEntity);
   }
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Remove from mount if being carried
   if (entityExists(transformComponent.mount)) {
      const mountTransformComponent = TransformComponentArray.getComponent(transformComponent.mount);

      let idx: number | undefined;
      for (let i = 0; i < mountTransformComponent.carriedEntities.length; i++) {
         const carryInfo = mountTransformComponent.carriedEntities[i];
         if (carryInfo.carriedEntity === entity) {
            idx = i;
            break;
         }
      }
      assert(typeof idx !== "undefined");

      mountTransformComponent.carriedEntities.splice(idx, 1);
   }

   // Unmount any chilren
   while (transformComponent.carriedEntities.length > 0) {
      const carryInfo = transformComponent.carriedEntities[0];
      if (carryInfo.destroyWhenMountIsDestroyed) {
         destroyEntity(carryInfo.carriedEntity);
         
         const idx = transformComponent.carriedEntities.indexOf(carryInfo);
         assert(idx !== -1);
         transformComponent.carriedEntities.splice(idx, 1);
      } else {
         dismountEntity(carryInfo.carriedEntity);
      }
   }

   // Remove hitboxes from their parent arrays
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.parent !== null) {
         const idx = hitbox.parent.children.indexOf(hitbox);
         assert(idx !== -1);
         hitbox.parent.children.splice(idx, 1);
      }
   }
   
   // Remove from chunks
   const layer = getEntityLayer(entity);
   for (let i = 0; i < transformComponent.chunks.length; i++) {
      const chunk = transformComponent.chunks[i];
      transformComponent.removeFromChunk(entity, layer, chunk);
   }

   // @Cleanup: Same as above. should we make a separate PathfindingOccupancyComponent?
   if (entityCanBlockPathfinding(entity)) {
      clearEntityPathfindingNodes(entity);
   }

   removeEntityLights(entity);
}

function getDataLength(entity: Entity): number {
   const transformComponent = TransformComponentArray.getComponent(entity);

   let lengthBytes = 5 * Float32Array.BYTES_PER_ELEMENT;
   
   for (const hitbox of transformComponent.hitboxes) {
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
         lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
      }
   }

   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * transformComponent.carriedEntities.length;

   return lengthBytes;
}

// @Speed
function addDataToPacket(packet: Packet, entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   packet.addNumber(transformComponent.rootEntity);
   
   packet.addNumber(transformComponent.collisionBit);
   packet.addNumber(transformComponent.collisionMask);
   
   packet.addNumber(transformComponent.hitboxes.length);
   for (const hitbox of transformComponent.hitboxes) {
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

         // Other hitbox
         packet.addNumber(tether.otherEntity !== null ? tether.otherEntity : 0);
         packet.addNumber(tether.otherHitbox.localID);
      } else {
         packet.addBoolean(false);
         packet.padOffset(3);
      }
   }

   packet.addNumber(transformComponent.carryRoot);
   packet.addNumber(transformComponent.mount);
   packet.addNumber(transformComponent.carriedEntities.length);
   for (const entityCarryInfo of transformComponent.carriedEntities) {
      packet.addNumber(entityCarryInfo.carriedEntity);
      packet.addNumber(entityCarryInfo.offsetX);
      packet.addNumber(entityCarryInfo.offsetY);
   }
}

/** Must be called after putting a hitbox as the child of another entity's hitbox.  */
export function attachEntityToHost(attachment: Entity, host: Entity, offsetX: number, offsetY: number, destroyWhenMountIsDestroyed: boolean): void {
   assert(host !== attachment);
   
   const mountTransformComponent = TransformComponentArray.getComponent(host);
   const entityTransformComponent = TransformComponentArray.getComponent(attachment);
   
   entityTransformComponent.carryRoot = mountTransformComponent.carryRoot;
   entityTransformComponent.mount = host;

   const carryInfo: EntityCarryInfo = {
      carriedEntity: attachment,
      offsetX: offsetX,
      offsetY: offsetY,
      destroyWhenMountIsDestroyed: destroyWhenMountIsDestroyed
   };
   mountTransformComponent.carriedEntities.push(carryInfo);

   // @Hack: this assumes the first hitbox of the entity is the one attached
   const attachmentTransformComponent = TransformComponentArray.getComponent(attachment);
   const attachedHitbox = attachmentTransformComponent.hitboxes[0];

   attachedHitbox.box.offset.x = offsetX;
   attachedHitbox.box.offset.y = offsetY;

   // @HACK
   const mountHitbox = mountTransformComponent.hitboxes[0];
   attachedHitbox.parent = mountHitbox;
   mountHitbox.children.push(attachedHitbox);

   // @HACK: for arrow
   if (attachedHitbox.parent !== null) {
      updateAttachedHitboxRecursively(attachedHitbox);
   }
}

const propagateCarryRootChange = (transformComponent: TransformComponent, carryRoot: Entity): void => {
   transformComponent.carryRoot = carryRoot;
   
   for (const carryInfo of transformComponent.carriedEntities) {
      const carriedEntityTransformComponent = TransformComponentArray.getComponent(carryInfo.carriedEntity);
      propagateCarryRootChange(carriedEntityTransformComponent, carryRoot);
   }
}

export function dismountEntity(entity: Entity): void {
   const entityTransformComponent = TransformComponentArray.getComponent(entity);

   const mount = entityTransformComponent.mount;
   const mountTransformComponent = TransformComponentArray.getComponent(mount);

   let idx: number | undefined;
   for (let i = 0; i < mountTransformComponent.carriedEntities.length; i++) {
      const carryInfo = mountTransformComponent.carriedEntities[i];
      if (carryInfo.carriedEntity === entity) {
         idx = i;
         break;
      }
   }
   assert(typeof idx !== "undefined");

   mountTransformComponent.carriedEntities.splice(idx, 1);
   registerDirtyEntity(mount);

   propagateCarryRootChange(entityTransformComponent, entity);
   entityTransformComponent.mount = 0;
}

export function getEntityTile(transformComponent: TransformComponent): TileIndex {
   // @Hack
   const hitbox = transformComponent.hitboxes[0];

   const tileX = Math.floor(hitbox.box.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(hitbox.box.position.y / Settings.TILE_SIZE);
   return getTileIndexIncludingEdges(tileX, tileY);
}

// @Location?
export function getHitboxTile(hitbox: Hitbox): TileIndex {
   const tileX = Math.floor(hitbox.box.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(hitbox.box.position.y / Settings.TILE_SIZE);
   return getTileIndexIncludingEdges(tileX, tileY);
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

export function getRandomPositionInEntity(transformComponent: TransformComponent): Point {
   const hitbox = transformComponent.hitboxes[randInt(0, transformComponent.hitboxes.length - 1)];
   const box = hitbox.box;
   return getRandomPositionInBox(box);
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
export function getFirstComponent<T extends object>(componentArray: ComponentArray<T>, entity: Entity): T | null {
   if (componentArray.hasComponent(entity)) {
      return componentArray.getComponent(entity);
   }
   
   // Check root entity
   // @Hack?
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent.rootEntity !== entity && componentArray.hasComponent(transformComponent.rootEntity)) {
      return componentArray.getComponent(transformComponent.rootEntity);
   }

   return null;
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