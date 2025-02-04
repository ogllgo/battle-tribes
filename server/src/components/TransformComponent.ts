import { PathfindingNodeIndex, RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { getEntityCollisionGroup } from "battletribes-shared/collision-groups";
import { assert, getTileIndexIncludingEdges, Point, randFloat, randInt, rotateXAroundOrigin, rotateYAroundOrigin, TileIndex } from "battletribes-shared/utils";
import Layer from "../Layer";
import Chunk from "../Chunk";
import { Entity, EntityType } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { AIHelperComponentArray, entityIsNoticedByAI } from "./AIHelperComponent";
import { TileType } from "battletribes-shared/tiles";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { clearEntityPathfindingNodes, entityCanBlockPathfinding, updateEntityPathfindingNodeOccupance } from "../pathfinding";
import { resolveWallCollision } from "../collision";
import { Packet } from "battletribes-shared/packets";
import { Box, boxIsCircular, BoxType, Hitbox, HitboxFlag, hitboxIsCircular, updateBox } from "battletribes-shared/boxes/boxes";
import { getEntityLayer, getEntityType } from "../world";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { removeEntityLights, updateEntityLights } from "../light-levels";

interface HitboxTether {
   readonly hitbox: Hitbox;
   readonly otherHitbox: Hitbox;
   
   readonly idealDistance: number;
   readonly springConstant: number;
   readonly damping: number;

   // Used for verlet integration
   previousOffsetX: number;
   previousOffsetY: number;
}

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
   public readonly chunks = new Array<Chunk>();
   // @Hack: used just so we can get chunk chunkIndex of a chunk in the addChunk function. Cursed. Remove this
   // public chunkIndexes = new Array<number>();

   public isInRiver = false;

   /** All hitboxes attached to the entity */
   public hitboxes = new Array<Hitbox>();
   public hitboxLocalIDs = new Array<number>();

   /** Hitboxes with no parent */
   public readonly rootHitboxes = new Array<Hitbox>();
   public readonly tethers = new Array<HitboxTether>();
   
   public boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   public boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   // @Deprecated: Only used by client
   public collisionBit = COLLISION_BITS.default;
   // @Deprecated: Only used by client
   public collisionMask = DEFAULT_COLLISION_MASK;
   
   public occupiedPathfindingNodes = new Set<PathfindingNodeIndex>();

   public nextHitboxLocalID = 1;

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

   public addHitboxTether(hitbox: Hitbox, otherHitbox: Hitbox, idealDistance: number, springConstant: number, damping: number): void {
      const tether: HitboxTether = {
         hitbox: hitbox,
         otherHitbox: otherHitbox,
         idealDistance: idealDistance,
         springConstant: springConstant,
         damping: damping,
         previousOffsetX: hitbox.box.offset.x,
         previousOffsetY: hitbox.box.offset.y
      };
      this.tethers.push(tether);
   }

   // @Cleanup: is there a way to avoid having this be optionally null? Or having the entity parameter here entirely?
   // Note: entity is null if the hitbox hasn't been created yet
   public addHitbox(hitbox: Hitbox, entity: Entity | null): void {
      this.hitboxes.push(hitbox);
      if (hitbox.box.parent === null) {
         this.rootHitboxes.push(hitbox);
      } else {
         hitbox.box.parent.children.push(hitbox.box);
      }

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
   
   /** Recalculates the entities' miscellaneous transforms stuff to match their position and rotation */
   public cleanHitboxes(entity: Entity): void {
      assert(this.hitboxes.length > 0);

      for (const hitbox of this.rootHitboxes) {
         cleanHitbox(this, hitbox, this.position, this.rotation);
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

// @Hack: THIS SHIT STINKY
const getHitboxByBox = (transformComponent: TransformComponent, box: Box): Hitbox => {
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.box === box) {
         return hitbox;
      }
   }

   throw new Error();
}

// @Cleanup: name is bad, doesn't fully 'clean' the hitbox.
const cleanHitbox = (transformComponent: TransformComponent, hitbox: Hitbox, parentPosition: Readonly<Point>, parentRotation: number): void => {
   updateBox(hitbox.box, parentPosition.x, parentPosition.y, parentRotation);

   for (const child of hitbox.box.children) {
      const childHitbox = getHitboxByBox(transformComponent, child);
      cleanHitbox(transformComponent, childHitbox, hitbox.box.position, hitbox.box.rotation);
   }
}

export const TransformComponentArray = new ComponentArray<TransformComponent>(ServerComponentType.transform, true, getDataLength, addDataToPacket);
TransformComponentArray.onJoin = onJoin;
TransformComponentArray.onRemove = onRemove;

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Hitboxes added before the entity joined the world haven't affected the transform yet, so we update them now
   transformComponent.cleanHitboxes(entity);
   
   transformComponent.updateIsInRiver(entity);
   
   // Add to chunks
   transformComponent.updateContainingChunks(entity);

   // @Cleanup: should we make a separate PathfindingOccupancyComponent?
   if (entityCanBlockPathfinding(entity)) {
      updateEntityPathfindingNodeOccupance(entity);
   }

   updateEntityLights(entity);
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

   removeEntityLights(entity);
}

const getBoxLocalID = (transformComponent: TransformComponent, box: Box): number => {
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitbox.box === box) {
         const localID = transformComponent.hitboxLocalIDs[i];
         return localID;
      }
   }

   throw new Error();
}

const addBaseHitboxData = (packet: Packet, transformComponent: TransformComponent | null, hitbox: Hitbox, localID: number): void => {
   // Important that local ID is important (see how the client uses it when updating from data)
   packet.addNumber(localID);
   
   const box = hitbox.box;
   packet.addNumber(box.position.x);
   packet.addNumber(box.position.y);
   packet.addNumber(box.relativeRotation);
   packet.addNumber(box.rotation);
   packet.addNumber(hitbox.mass);
   packet.addNumber(box.offset.x);
   packet.addNumber(box.offset.y);
   packet.addNumber(box.scale);
   packet.addNumber(hitbox.collisionType);
   packet.addNumber(hitbox.collisionBit);
   packet.addNumber(hitbox.collisionMask);
   // Flags
   packet.addNumber(hitbox.flags.length);
   for (const flag of hitbox.flags) {
      packet.addNumber(flag);
   }

   const parentHitboxLocalID = hitbox.box.parent !== null && transformComponent !== null ? getBoxLocalID(transformComponent, hitbox.box.parent) : -1;
   packet.addNumber(parentHitboxLocalID);
}
const getBaseHitboxDataLength = (hitbox: Hitbox): number => {
   let lengthBytes = 12 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * hitbox.flags.length;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   return lengthBytes;
}

export function addCircularHitboxData(packet: Packet, transformComponent: TransformComponent | null, hitbox: Hitbox<BoxType.circular>, localID: number): void {
   addBaseHitboxData(packet, transformComponent, hitbox, localID);
   
   const box = hitbox.box;
   packet.addNumber(box.radius);
}
export function getCircularHitboxDataLength(hitbox: Hitbox<BoxType.circular>): number {
   return getBaseHitboxDataLength(hitbox) + Float32Array.BYTES_PER_ELEMENT;
}

export function addRectangularHitboxData(packet: Packet, transformComponent: TransformComponent | null, hitbox: Hitbox<BoxType.rectangular>, localID: number): void {
   addBaseHitboxData(packet, transformComponent, hitbox, localID);

   const box = hitbox.box;
   packet.addNumber(box.width);
   packet.addNumber(box.height);
}
export function getRectangularHitboxDataLength(hitbox: Hitbox<BoxType.rectangular>): number {
   return getBaseHitboxDataLength(hitbox) + 2 * Float32Array.BYTES_PER_ELEMENT;
}

function getDataLength(entity: Entity): number {
   const transformComponent = TransformComponentArray.getComponent(entity);

   let lengthBytes = 7 * Float32Array.BYTES_PER_ELEMENT;
   
   for (const hitbox of transformComponent.hitboxes) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      if (hitboxIsCircular(hitbox)) {
         lengthBytes += getCircularHitboxDataLength(hitbox);
      } else {
         // @Hack: cast
         lengthBytes += getRectangularHitboxDataLength(hitbox as Hitbox<BoxType.rectangular>);
      }

      lengthBytes += Float32Array.BYTES_PER_ELEMENT;

      // @Copynpaste
      let tether: HitboxTether | undefined;
      for (const currentTether of transformComponent.tethers) {
         if (currentTether.hitbox === hitbox) {
            tether = currentTether;
         }
      }

      if (typeof tether !== "undefined") {
         lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      }
   }

   return lengthBytes;
}

// @Speed
function addDataToPacket(packet: Packet, entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   packet.addNumber(transformComponent.position.x);
   packet.addNumber(transformComponent.position.y);
   packet.addNumber(transformComponent.rotation);
   packet.addNumber(transformComponent.collisionBit);
   packet.addNumber(transformComponent.collisionMask);
   
   packet.addNumber(transformComponent.hitboxes.length);
   for (const hitbox of transformComponent.hitboxes) {
      const localID = transformComponent.hitboxLocalIDs[transformComponent.hitboxes.indexOf(hitbox)];

      if (hitboxIsCircular(hitbox)) {
         packet.addBoolean(true);
         packet.padOffset(3);
         
         addCircularHitboxData(packet, transformComponent, hitbox, localID);
      } else {
         packet.addBoolean(false);
         packet.padOffset(3);

         // @Hack: cast
         addRectangularHitboxData(packet, transformComponent, hitbox as Hitbox<BoxType.rectangular>, localID);
      }

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
         packet.addNumber(getBoxLocalID(transformComponent, tether.otherHitbox.box));
      } else {
         packet.addBoolean(false);
         packet.padOffset(3);
      }
   }
}

export function getEntityTile(transformComponent: TransformComponent): TileIndex {
   const tileX = Math.floor(transformComponent.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(transformComponent.position.y / Settings.TILE_SIZE);
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