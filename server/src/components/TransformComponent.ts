import { PathfindingNodeIndex, RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { CollisionGroup } from "battletribes-shared/collision-groups";
import { assert, Point, randFloat, randInt, rotateXAroundOrigin, rotateYAroundOrigin, TileIndex } from "battletribes-shared/utils";
import Layer, { getTileIndexIncludingEdges } from "../Layer";
import Chunk from "../Chunk";
import { Entity } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { AIHelperComponentArray, entityIsNoticedByAI } from "./AIHelperComponent";
import { TileType } from "battletribes-shared/tiles";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { clearEntityPathfindingNodes, entityCanBlockPathfinding, updateEntityPathfindingNodeOccupance } from "../pathfinding";
import { resolveWallCollision } from "../collision";
import { Packet } from "battletribes-shared/packets";
import { Box, boxIsCircular, Hitbox, HitboxFlag, updateBox } from "battletribes-shared/boxes/boxes";
import { getEntityLayer } from "../world";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { TetheredHitboxComponentArray } from "./TetheredHitboxComponent";

// @Cleanup: move mass/hitbox related stuff out? (Are there any entities which could take advantage of that extraction?)

export class TransformComponent {
   /** Combined mass of all the entity's hitboxes */
   public totalMass = 0;

   /** Position of the entity in the world */
   public position = new Point(0, 0);

   /** Direction the entity is facing in radians */
   public rotation = 0;

   // @Cleanup: unused?
   public collisionPushForceMultiplier = 1;

   /** Set of all chunks the entity is contained in */
   public chunks = new Array<Chunk>();
   // @Hack: used just so we can get chunk chunkIndex of a chunk in the addChunk function. Cursed. Remove this
   // public chunkIndexes = new Array<number>();

   public isInRiver = false;

   /** All hitboxes attached to the entity */
   public hitboxes = new Array<Hitbox>();
   public hitboxLocalIDs = new Array<number>();
   
   public boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   public boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   // @Deprecated: Only used by client
   public collisionBit = COLLISION_BITS.default;
   // @Deprecated: Only used by client
   public collisionMask = DEFAULT_COLLISION_MASK;

   // Doesn't change as that would require updating the entity and where it is in which chunks
   public readonly collisionGroup: CollisionGroup;
   
   public occupiedPathfindingNodes = new Set<PathfindingNodeIndex>();

   public nextHitboxLocalID = 1;

   constructor(collisionGroup: CollisionGroup) {
      this.collisionGroup = collisionGroup;
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
      for (const chunk of this.chunks) {
         for (const steppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
            
            const distX = this.position.x - steppingStone.positionX;
            const distY = this.position.y - steppingStone.positionY;
            if (distX * distX + distY * distY <= size * size / 4) {
               this.isInRiver = false;
               return;
            }
         }
      }

      this.isInRiver = true;
   }

   // @Cleanup: is there a way to avoid having this be optionally null? Or having the entity parameter here entirely?
   // Note: entity is null if the hitbox hasn't been created yet
   public addHitbox(hitbox: Hitbox, entity: Entity | null): void {
      this.hitboxes.push(hitbox);

      const localID = this.nextHitboxLocalID++;
      this.hitboxLocalIDs.push(localID);
      
      this.totalMass += hitbox.mass;

      // Only update the transform stuff if the entity is created, as if it isn't created then the position of the entity will just be 0,0 (default).
      if (entity !== null) {
         const box = hitbox.box;
         updateBox(box, this.position.x, this.position.y, this.rotation);
      
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

   // @Copynpaste
   public resetHitboxes(entity: Entity): void {
      assert(this.hitboxes.length > 0);

      // @Cleanup: lmao this is the only thing that's different
      for (const hitbox of this.hitboxes) {
         updateBox(hitbox.box, this.position.x, this.position.y, this.rotation);
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
   
   /** Recalculates the entities' miscellaneous transforms stuff to match their position and rotation */
   public cleanHitboxes(entity: Entity): void {
      assert(this.hitboxes.length > 0);

      if (TetheredHitboxComponentArray.hasComponent(entity)) {
         // Update the first hitbox in the link
         const tetheredHitboxComponent = TetheredHitboxComponentArray.getComponent(entity);
         const box = tetheredHitboxComponent.restrictions[0].hitbox.box;

         // @Hack
         const tempX = box.offset.x;
         const tempY = box.offset.y;
         box.offset.x = 0;
         box.offset.y = 0;
         
         updateBox(box, this.position.x, this.position.y, this.rotation);

         box.offset.x = tempX;
         box.offset.y = tempY;
      } else {
         // Update all of them
         for (const hitbox of this.hitboxes) {
            updateBox(hitbox.box, this.position.x, this.position.y, this.rotation);
         }
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
      const collisionChunk = layer.getCollisionChunkByIndex(this.collisionGroup, chunkIndex);
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
      const collisionChunk = layer.getCollisionChunkByIndex(this.collisionGroup, chunkIndex);
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

export const TransformComponentArray = new ComponentArray<TransformComponent>(ServerComponentType.transform, true, {
   onJoin: onJoin,
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

export function getEntityTile(transformComponent: TransformComponent): TileIndex {
   const tileX = Math.floor(transformComponent.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(transformComponent.position.y / Settings.TILE_SIZE);
   return getTileIndexIncludingEdges(tileX, tileY);
}

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Hitboxes added before the entity joined the world haven't affected the transform yet, so we update them now
   transformComponent.resetHitboxes(entity);

   // @Hack @Cleanup
   if (TetheredHitboxComponentArray.hasComponent(entity)) {
      const tetheredHitboxComponent = TetheredHitboxComponentArray.getComponent(entity);
      for (const restriction of tetheredHitboxComponent.restrictions) {
         restriction.previousX = restriction.hitbox.box.position.x;
         restriction.previousY = restriction.hitbox.box.position.y;
      }
   }
   
   transformComponent.updateIsInRiver(entity);
   
   // Add to chunks
   transformComponent.updateContainingChunks(entity);

   // @Cleanup: should we make a separate PathfindingOccupancyComponent?
   if (entityCanBlockPathfinding(entity)) {
      updateEntityPathfindingNodeOccupance(entity);
   }
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

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
}

function getDataLength(entity: Entity): number {
   const transformComponent = TransformComponentArray.getComponent(entity);

   let lengthBytes = 8 * Float32Array.BYTES_PER_ELEMENT;
   
   for (const hitbox of transformComponent.hitboxes) {
      if (boxIsCircular(hitbox.box)) {
         lengthBytes += 13 * Float32Array.BYTES_PER_ELEMENT;
      } else {
         lengthBytes += 14 * Float32Array.BYTES_PER_ELEMENT;
      }
      lengthBytes += hitbox.flags.length * Float32Array.BYTES_PER_ELEMENT;
   }

   return lengthBytes;
}

// @Speed
function addDataToPacket(packet: Packet, entity: Entity): void {
   // @Speed: can be made faster if we pre-filter which hitboxes are circular and rectangular

   const transformComponent = TransformComponentArray.getComponent(entity);

   packet.addNumber(transformComponent.position.x);
   packet.addNumber(transformComponent.position.y);
   packet.addNumber(transformComponent.rotation);
   packet.addNumber(transformComponent.collisionBit);
   packet.addNumber(transformComponent.collisionMask);
   
   // @Speed
   let numCircularHitboxes = 0;
   for (const hitbox of transformComponent.hitboxes) {
      if (boxIsCircular(hitbox.box)) {
         numCircularHitboxes++;
      }
   }
   const numRectangularHitboxes = transformComponent.hitboxes.length - numCircularHitboxes;
   
   // Circular
   packet.addNumber(numCircularHitboxes);
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;
      // @Speed
      if (!boxIsCircular(box)) {
         continue;
      }

      const localID = transformComponent.hitboxLocalIDs[transformComponent.hitboxes.indexOf(hitbox)];
      
      packet.addNumber(box.position.x);
      packet.addNumber(box.position.y);
      packet.addNumber(box.rotation);
      packet.addNumber(hitbox.mass);
      packet.addNumber(box.offset.x);
      packet.addNumber(box.offset.y);
      packet.addNumber(box.scale);
      packet.addNumber(hitbox.collisionType);
      packet.addNumber(hitbox.collisionBit);
      packet.addNumber(hitbox.collisionMask);
      packet.addNumber(localID);
      // Flags
      packet.addNumber(hitbox.flags.length);
      for (const flag of hitbox.flags) {
         packet.addNumber(flag);
      }
      packet.addNumber(box.radius);
   }
   
   // Rectangular
   packet.addNumber(numRectangularHitboxes);
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;
      // @Speed
      if (boxIsCircular(box)) {
         continue;
      }

      const localID = transformComponent.hitboxLocalIDs[transformComponent.hitboxes.indexOf(hitbox)];

      packet.addNumber(box.position.x);
      packet.addNumber(box.position.y);
      packet.addNumber(hitbox.mass);
      packet.addNumber(box.offset.x);
      packet.addNumber(box.offset.y);
      packet.addNumber(box.scale);
      packet.addNumber(hitbox.collisionType);
      packet.addNumber(hitbox.collisionBit);
      packet.addNumber(hitbox.collisionMask);
      packet.addNumber(localID);
      // Flags
      packet.addNumber(hitbox.flags.length);
      for (const flag of hitbox.flags) {
         packet.addNumber(flag);
      }
      packet.addNumber(box.width);
      packet.addNumber(box.height);
      packet.addNumber(box.relativeRotation);
   }
}

export function getRandomPositionInBox(box: Box): Point {
   if (boxIsCircular(box)) {
      return box.position.offset(box.radius * Math.random(), 2 * Math.PI * Math.random());
   } else {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      const x = box.position.x + rotateXAroundOrigin(xOffset, yOffset, box.rotation);
      const y = box.position.y + rotateYAroundOrigin(xOffset, yOffset, box.rotation);
      return new Point(x, y);
   }
}

export function getRandomPositionInEntity(transformComponent: TransformComponent): Point {
   const hitbox = transformComponent.hitboxes[randInt(0, transformComponent.hitboxes.length - 1)];
   const box = hitbox.box;
   return getRandomPositionInBox(box);
}