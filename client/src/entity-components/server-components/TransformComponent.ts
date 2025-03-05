import { assert, distance, Point, randSign, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { Tile } from "../../Tile";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import Chunk from "../../Chunk";
import { randInt } from "battletribes-shared/utils";
import { randFloat } from "battletribes-shared/utils";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { boxIsCircular, updateBox, Box } from "battletribes-shared/boxes/boxes";
import Layer, { getTileIndexIncludingEdges } from "../../Layer";
import { entityExists, EntityParams, getCurrentLayer, getEntityLayer, getEntityRenderInfo, getEntityType, surfaceLayer } from "../../world";
import Board from "../../Board";
import { Entity, EntityType } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, HitboxCollisionBit } from "../../../../shared/src/collision";
import { registerDirtyRenderInfo } from "../../rendering/render-part-matrices";
import { playSound } from "../../sound";
import Camera from "../../Camera";
import { RideableComponentArray } from "./RideableComponent";
import { playerInstance } from "../../player";
import { createHitboxReference, Hitbox, HitboxReference } from "../../hitboxes";
import { padHitboxData, readHitboxFromData, updateHitboxFromData } from "../../networking/packet-hitboxes";

export interface HitboxTetherParams {
   readonly hitboxLocalID: number;
   readonly otherHitbox: HitboxReference;
}

export interface HitboxTether {
   readonly hitbox: Hitbox;
   readonly otherHitbox: Hitbox;
}

export interface EntityCarryInfo {
   readonly carriedEntity: Entity;
   readonly offsetX: number;
   readonly offsetY: number;
   lastUpdateTicks: number;
}

export interface TransformComponentParams {
   readonly hitboxes: Array<Hitbox>;
   readonly tethers: Array<HitboxTetherParams>;
   readonly collisionBit: HitboxCollisionBit;
   readonly collisionMask: number;
   readonly carryRoot: Entity;
   readonly mount: Entity;
   readonly carriedEntities: Array<EntityCarryInfo>;
}

export interface TransformComponent {
   totalMass: number;
   
   readonly chunks: Set<Chunk>;

   hitboxes: Array<Hitbox>;
   readonly hitboxMap: Map<number, Hitbox>;

   readonly rootHitboxes: Array<Hitbox>;
   readonly tethers: Array<HitboxTether>;

   collisionBit: number;
   collisionMask: number;

   boundingAreaMinX: number;
   boundingAreaMaxX: number;
   boundingAreaMinY: number;
   boundingAreaMaxY: number;

   carryRoot: Entity;
   mount: Entity;
   readonly carriedEntities: Array<EntityCarryInfo>;
}

const fillTransformComponentParams = (hitboxes: Array<Hitbox>, tethers: Array<HitboxTetherParams>, collisionBit: HitboxCollisionBit, collisionMask: number, carryRoot: Entity, mount: Entity, carriedEntities: Array<EntityCarryInfo>): TransformComponentParams => {
   return {
      hitboxes: hitboxes,
      tethers: tethers,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      carryRoot: carryRoot,
      mount: mount,
      carriedEntities: carriedEntities
   };
}

export function createTransformComponentParams(hitboxes: Array<Hitbox>): TransformComponentParams {
   return {
      hitboxes: hitboxes,
      tethers: [],
      collisionBit: COLLISION_BITS.default,
      collisionMask: DEFAULT_COLLISION_MASK,
      carryRoot: 0,
      mount: 0,
      carriedEntities: []
   };
}

function createParamsFromData(reader: PacketReader): TransformComponentParams {
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();

   const hitboxes = new Array<Hitbox>();
   const tethers = new Array<HitboxTetherParams>();
   
   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const localID = reader.readNumber();

      const hitbox = readHitboxFromData(reader, localID, hitboxes);
      hitboxes.push(hitbox);

      const isTethered = reader.readBoolean();
      reader.padOffset(3);
      if (isTethered) {
         const otherHitboxLocalID = reader.readNumber();

         const otherHitbox = getHitboxByLocalID(hitboxes, otherHitboxLocalID);
         assert(otherHitbox !== null);

         const tether: HitboxTetherParams = {
            hitboxLocalID: hitbox.localID,
            // @Incomplete: entity?
            otherHitbox: createHitboxReference(null, otherHitbox.localID)
         };
         tethers.push(tether);
      }
   }

   assert(hitboxes.length > 0);

   const carryRoot = reader.readNumber() as Entity;
   const mount = reader.readNumber() as Entity;
   const carriedEntities = new Array<EntityCarryInfo>();
   
   const numCarriedEntities = reader.readNumber();
   for (let i = 0; i < numCarriedEntities; i++) {
      const carriedEntity = reader.readNumber();
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();

      const carryInfo: EntityCarryInfo = {
         carriedEntity: carriedEntity,
         offsetX: offsetX,
         offsetY: offsetY,
         lastUpdateTicks: Board.serverTicks
      };
      carriedEntities.push(carryInfo);
   }

   return fillTransformComponentParams(hitboxes, tethers, collisionBit, collisionMask, carryRoot, mount, carriedEntities);
}

export function getEntityTile(layer: Layer, transformComponent: TransformComponent): Tile {
   // @Hack
   const hitbox = transformComponent.hitboxes[0];
   
   const tileX = Math.floor(hitbox.box.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(hitbox.box.position.y / Settings.TILE_SIZE);
   
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   return layer.getTile(tileIndex);
}

// @Location
export function getHitboxTile(layer: Layer, hitbox: Hitbox): Tile {
   const tileX = Math.floor(hitbox.box.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(hitbox.box.position.y / Settings.TILE_SIZE);
   
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   return layer.getTile(tileIndex);
}

export function getHitboxByLocalID(hitboxes: ReadonlyArray<Hitbox>, localID: number): Hitbox | null {
   for (const hitbox of hitboxes) {
      if (hitbox.localID === localID) {
         return hitbox;
      }
   }
   return null;
}

const addHitbox = (transformComponent: TransformComponent, hitbox: Hitbox): void => {
   transformComponent.hitboxes.push(hitbox);
   transformComponent.hitboxMap.set(hitbox.localID, hitbox);

   if (hitbox.parent === null) {
      transformComponent.rootHitboxes.push(hitbox);
   } else {
      const parent = hitbox.parent;
      updateBox(hitbox.box, parent.box.position.x, parent.box.position.y, parent.box.angle);
   }
}
   
export function removeHitboxFromEntity(transformComponent: TransformComponent, hitbox: Hitbox, idx: number): void {
   transformComponent.hitboxes.splice(idx, 1);
   transformComponent.hitboxMap.delete(hitbox.localID);

   if (hitbox.parent === null) {
      const idx = transformComponent.rootHitboxes.indexOf(hitbox);
      assert(idx !== -1);
      transformComponent.rootHitboxes.splice(idx, 1);
   }
}

export function entityIsInRiver(transformComponent: TransformComponent, entity: Entity): boolean {
   const layer = getEntityLayer(entity);
   const tile = getEntityTile(layer, transformComponent);
   if (tile.type !== TileType.water) {
      return false;
   }

   // @Hack
   const hitbox = transformComponent.hitboxes[0];
   
   // If the game object is standing on a stepping stone they aren't in a river
   for (const chunk of transformComponent.chunks) {
      for (const steppingStone of chunk.riverSteppingStones) {
         const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
         
         const dist = distance(hitbox.box.position.x, hitbox.box.position.y, steppingStone.positionX, steppingStone.positionY);
         if (dist <= size/2) {
            return false;
         }
      }
   }

   return true;
}

// @Cleanup: name is bad, doesn't fully 'clean' the hitbox.
const updateAttachedHitboxRecursively = (hitbox: Hitbox): void => {
   const parent = hitbox.parent;
   assert(parent !== null);

   hitbox.velocity.x = parent.velocity.x;
   hitbox.velocity.y = parent.velocity.y;
   
   for (const childHitbox of hitbox.children) {
      updateBox(childHitbox.box, hitbox.box.position.x, hitbox.box.position.y, hitbox.box.angle);
      updateAttachedHitboxRecursively(childHitbox);
   }
}

const cleanHitboxes = (transformComponent: TransformComponent): void => {
   for (const rootHitbox of transformComponent.rootHitboxes) {
      rootHitbox.box.angle = rootHitbox.box.relativeAngle;
      for (const child of rootHitbox.children) {
         updateAttachedHitboxRecursively(child);
      }
   }
   // @Incomplete
   // @Hack?
   // if (!TetheredHitboxComponentArray.hasComponent(entity)) {
   //    for (const hitbox of transformComponent.hitboxes) {
   //       updateBox(hitbox.box, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);
   //    }
   // } else {
   //    // @hack
   //    const box = transformComponent.hitboxes[0].box;

   //    // @Hack
   //    const tempX = box.offset.x;
   //    const tempY = box.offset.y;
   //    box.offset.x = 0;
   //    box.offset.y = 0;

   //    updateBox(box, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);

   //    box.offset.x = tempX;
   //    box.offset.y = tempY;
   // }

   transformComponent.boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   transformComponent.boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   transformComponent.boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   transformComponent.boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   for (const hitbox of transformComponent.hitboxes) {
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
   }
}

/** Recalculates which chunks the game object is contained in */
const updateContainingChunks = (transformComponent: TransformComponent, entity: Entity): void => {
   const layer = getEntityLayer(entity);
   const containingChunks = new Set<Chunk>();
   
   // Find containing chunks
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;

      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();

      const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            containingChunks.add(chunk);
         }
      }
   }

   // Find all chunks which aren't present in the new chunks and remove them
   for (const chunk of transformComponent.chunks) {
      if (!containingChunks.has(chunk)) {
         chunk.removeEntity(entity);
         transformComponent.chunks.delete(chunk);
      }
   }

   // Add all new chunks
   for (const chunk of containingChunks) {
      if (!transformComponent.chunks.has(chunk)) {
         chunk.addEntity(entity);
         transformComponent.chunks.add(chunk);
      }
   }
}

export function updateEntityPosition(transformComponent: TransformComponent, entity: Entity): void {
   cleanHitboxes(transformComponent);
   updateContainingChunks(transformComponent, entity);
}

export const TransformComponentArray = new ServerComponentArray<TransformComponent, TransformComponentParams, never>(ServerComponentType.transform, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onLoad: onLoad,
   onRemove: onRemove,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

function createComponent(entityParams: EntityParams): TransformComponent {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   
   let totalMass = 0;
   const rootHitboxes = new Array<Hitbox>();
   const hitboxMap = new Map<number, Hitbox>();
   for (const hitbox of transformComponentParams.hitboxes) {
      totalMass += hitbox.mass;
      hitboxMap.set(hitbox.localID, hitbox);
      if (hitbox.parent === null) {
         rootHitboxes.push(hitbox);
      }
   }

   const tethers = new Array<HitboxTether>();
   for (const tetherParams of transformComponentParams.tethers) {
      const otherHitbox = getHitboxByLocalID(transformComponentParams.hitboxes, tetherParams.hitboxLocalID)!;
      tethers.push({
         hitbox: getHitboxByLocalID(transformComponentParams.hitboxes, tetherParams.hitboxLocalID)!,
         otherHitbox: otherHitbox
      });
   }

   assert(transformComponentParams.hitboxes.length > 0);
   
   return {
      totalMass: totalMass,
      chunks: new Set(),
      hitboxes: transformComponentParams.hitboxes,
      hitboxMap: hitboxMap,
      tethers: tethers,
      rootHitboxes: rootHitboxes,
      collisionBit: transformComponentParams.collisionBit,
      collisionMask: transformComponentParams.collisionMask,
      boundingAreaMinX: Number.MAX_SAFE_INTEGER,
      boundingAreaMaxX: Number.MIN_SAFE_INTEGER,
      boundingAreaMinY: Number.MAX_SAFE_INTEGER,
      boundingAreaMaxY: Number.MIN_SAFE_INTEGER,
      carryRoot: transformComponentParams.carryRoot,
      mount: transformComponentParams.mount,
      carriedEntities: transformComponentParams.carriedEntities
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function onLoad(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   updateEntityPosition(transformComponent, entity);
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (const chunk of transformComponent.chunks) {
      chunk.removeEntity(entity);
   }
}

function padData(reader: PacketReader): void {
   // @Bug: I think this is off.... Length of entity data is wrong then?
   reader.padOffset(6 * Float32Array.BYTES_PER_ELEMENT);

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      padHitboxData(reader);

      const isTethered = reader.readBoolean();
      reader.padOffset(3);
      if (isTethered) {
         reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      }
   }

   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   const numCarriedEntities = reader.readNumber();
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT * numCarriedEntities);
}

const updateCarryInfoFromData = (reader: PacketReader, entity: Entity, transformComponent: TransformComponent): void => {
   transformComponent.carryRoot = reader.readNumber();

   const mount = reader.readNumber();
   if (mount !== transformComponent.mount) {
      // Play mount sound when entity mounts a carry slot
      if (entityExists(mount) && !entityExists(transformComponent.mount) && RideableComponentArray.hasComponent(mount)) {
         switch (getEntityType(entity)) {
            case EntityType.barrel: {
               playSound("barrel-mount.mp3", 0.4, 1, Camera.position.copy(), getCurrentLayer());
               break;
            }
            default: {
               playSound("mount.mp3", 0.4, 1, Camera.position.copy(), getCurrentLayer());
               break;
            }
         }
      // Play a sound when the entity dismounts a carry slot
      } else if (!entityExists(mount) && entityExists(transformComponent.mount) && RideableComponentArray.hasComponent(transformComponent.mount)) {
         playSound("dismount.mp3", 0.4, 1, Camera.position.copy(), getCurrentLayer());
      }
   }
   transformComponent.mount = mount;

   // Update existing and check for new carried entities
   const numCarriedEntities = reader.readNumber();
   for (let i = 0; i < numCarriedEntities; i++) {
      const carriedEntity = reader.readNumber();
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();

      let existingCarryInfo: EntityCarryInfo | undefined;
      for (let i = 0; i < transformComponent.carriedEntities.length; i++) {
         const carryInfo = transformComponent.carriedEntities[i];
         if (carryInfo.carriedEntity === carriedEntity) {
            existingCarryInfo = carryInfo;
            break;
         }
      }
      
      if (typeof existingCarryInfo !== "undefined") {
         existingCarryInfo.lastUpdateTicks = Board.serverTicks;
      } else {
         // @Copynpaste
         const carryInfo: EntityCarryInfo = {
            carriedEntity: carriedEntity,
            offsetX: offsetX,
            offsetY: offsetY,
            lastUpdateTicks: Board.serverTicks
         };
         transformComponent.carriedEntities.push(carryInfo);
      }
   }

   // Check for removed carried entities
   for (let i = 0; i < transformComponent.carriedEntities.length; i++) {
      const carryInfo = transformComponent.carriedEntities[i];
      if (carryInfo.lastUpdateTicks !== Board.serverTicks) {
         // @Hack
         if (carryInfo.carriedEntity === playerInstance) {
            const rideableComponent = RideableComponentArray.getComponent(entity);
            const carrySlot = rideableComponent.carrySlots[0];

            // Set the player to the dismount position

            const transformComponent = TransformComponentArray.getComponent(playerInstance);
            const playerHitbox = transformComponent.hitboxes[0];

            const mountTransformComponent = TransformComponentArray.getComponent(entity);
            // @Hack
            const mountHitbox = mountTransformComponent.hitboxes[0];
            playerHitbox.box.position.x = mountHitbox.box.position.x + rotateXAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountHitbox.box.relativeAngle);
            playerHitbox.box.position.y = mountHitbox.box.position.y + rotateYAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountHitbox.box.relativeAngle);
         }
         
         transformComponent.carriedEntities.splice(i, 1);
         i--;
      }
   }
}
   
function updateFromData(reader: PacketReader, entity: Entity): void {
   // @SPEED: What we could do is explicitly send which hitboxes have been created, and removed, from the server. (When using carmack networking)
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // @HACK @SPEED? (actually this might be ok just if we do the optimisation which only sends components which were updated, not all of em at once)
   const renderInfo = getEntityRenderInfo(entity);
   registerDirtyRenderInfo(renderInfo);
   
   transformComponent.collisionBit = reader.readNumber();
   transformComponent.collisionMask = reader.readNumber();

   // @Speed: would be faster if we split the hitboxes array
   let existingNumCircular = 0;
   let existingNumRectangular = 0;
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (boxIsCircular(hitbox.box)) {
         existingNumCircular++;
      } else {
         existingNumRectangular++;
      }
   }

   let newNumCircular = 0;
   let newNumRectangular = 0;
   let hasAddedCircular = false;
   let hasAddedRectangular = false;

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const localID = reader.readNumber();

      const existingHitbox = transformComponent.hitboxMap.get(localID);
      if (typeof existingHitbox === "undefined") {
         const hitbox = readHitboxFromData(reader, localID, transformComponent.hitboxes);

         addHitbox(transformComponent, hitbox);
         if (boxIsCircular(hitbox.box)) {
            newNumCircular++;
            hasAddedCircular = true;
         } else {
            newNumRectangular++;
            hasAddedRectangular = true;
         }

         const isTethered = reader.readBoolean();
         reader.padOffset(3);
         if (isTethered) {
            // @Copynpaste
            const otherHitboxLocalID = reader.readNumber();
            const otherHitbox = getHitboxByLocalID(transformComponent.hitboxes, otherHitboxLocalID);
            assert(otherHitbox !== null);
            const tether: HitboxTether = {
               hitbox: hitbox,
               otherHitbox: otherHitbox
            };
            transformComponent.tethers.push(tether);
         }
      } else {
         updateHitboxFromData(existingHitbox, reader);
         if (boxIsCircular(existingHitbox.box)) {
            newNumCircular++;
         } else {
            newNumRectangular++;
         }

         const isTethered = reader.readBoolean();
         reader.padOffset(3);
         if (isTethered) {
            reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
         }
      }
   }

   // Remove hitboxes which no longer exist
   if (((newNumCircular !== existingNumRectangular) || hasAddedCircular) ||
       (newNumRectangular !== existingNumRectangular) || hasAddedRectangular) {
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         const hitbox = transformComponent.hitboxes[i];
         if (hitbox.lastUpdateTicks !== Board.serverTicks) {
            // Hitbox is removed!
            removeHitboxFromEntity(transformComponent, hitbox, i);
            i--;
         }
      }
   }

   // @Speed
   transformComponent.totalMass = 0;
   for (const hitbox of transformComponent.hitboxes) {
      transformComponent.totalMass += hitbox.mass;
   }

   // Update containing chunks
   // @Copynpaste

   // @Speed
   // @Speed
   // @Speed

   const containingChunks = new Set<Chunk>();

   const layer = getEntityLayer(entity);
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;

      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();

      // Recalculate the game object's containing chunks based on the new hitbox bounds
      const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            containingChunks.add(chunk);
         }
      }
   }

   // Find all chunks which aren't present in the new chunks and remove them
   for (const chunk of transformComponent.chunks) {
      if (!containingChunks.has(chunk)) {
         chunk.removeEntity(entity);
         transformComponent.chunks.delete(chunk);
      }
   }

   // Add all new chunks
   for (const chunk of containingChunks) {
      if (!transformComponent.chunks.has(chunk)) {
         chunk.addEntity(entity);
         transformComponent.chunks.add(chunk);
      }
   }

   updateCarryInfoFromData(reader, entity, transformComponent);
}

function updatePlayerFromData(reader: PacketReader, isInitialData: boolean): void {
   if (isInitialData) {
      updateFromData(reader, playerInstance!);
      return;
   }

   // 
   // Update carry roots and carrying entities
   // 
   // @Bug: This should be 7...? Length of entity data is wrong then?
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

      padHitboxData(reader);

      const isTethered = reader.readBoolean();
      reader.padOffset(3);
      if (isTethered) {
         reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      }
   }

   const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   updateCarryInfoFromData(reader, playerInstance!, transformComponent);
}

export function getRandomPositionInBox(box: Box): Point {
   if (boxIsCircular(box)) {
      const offsetMagnitude = box.radius * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      return new Point(box.position.x + offsetMagnitude * Math.sin(offsetDirection), box.position.y + offsetMagnitude * Math.cos(offsetDirection));
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

// @Cleanup: copy and paste from server
export function getRandomPositionInEntity(transformComponent: TransformComponent): Point {
   const hitbox = transformComponent.hitboxes[randInt(0, transformComponent.hitboxes.length - 1)];
   const box = hitbox.box;

   return getRandomPositionInBox(box);
}

export function getRandomPositionOnBoxEdge(box: Box): Point {
   if (boxIsCircular(box)) {
      const offsetMagnitude = box.radius;
      const offsetDirection = 2 * Math.PI * Math.random();
      return new Point(box.position.x + offsetMagnitude * Math.sin(offsetDirection), box.position.y + offsetMagnitude * Math.cos(offsetDirection));
   } else {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      let xOffset: number;
      let yOffset: number;
      if (Math.random() < 0.5) {
         xOffset = randFloat(-halfWidth, halfWidth);
         yOffset = halfHeight * randSign();
      } else {
         xOffset = halfWidth * randSign();
         yOffset = randFloat(-halfHeight, halfHeight);
      }

      const x = box.position.x + rotateXAroundOrigin(xOffset, yOffset, box.angle);
      const y = box.position.y + rotateYAroundOrigin(xOffset, yOffset, box.angle);
      return new Point(x, y);
   }
}

export function entityIsVisibleToCamera(entity: Entity): boolean {
   if (getEntityLayer(entity) === getCurrentLayer()) {
      return true;
   }

   // If on a different layer, the entity must be below a dropdown tile
   
   const transformComponent = TransformComponentArray.getComponent(entity);

   const minTileX = Math.floor(transformComponent.boundingAreaMinX / Settings.TILE_SIZE);
   const maxTileX = Math.floor(transformComponent.boundingAreaMaxX / Settings.TILE_SIZE);
   const minTileY = Math.floor(transformComponent.boundingAreaMinY / Settings.TILE_SIZE);
   const maxTileY = Math.floor(transformComponent.boundingAreaMaxY / Settings.TILE_SIZE);
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = surfaceLayer.getTileFromCoords(tileX, tileY);
         if (tile.type === TileType.dropdown) {
            return true;
         }
      }
   }

   return false;
}