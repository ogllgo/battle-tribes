import { assert, distance, Point, randAngle, randSign, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { Tile } from "../../Tile";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import Chunk from "../../Chunk";
import { randFloat } from "battletribes-shared/utils";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { boxIsCircular, updateBox, Box } from "battletribes-shared/boxes/boxes";
import Layer, { getTileIndexIncludingEdges } from "../../Layer";
import { entityExists, EntityParams, getCurrentLayer, getEntityLayer, getEntityRenderInfo, surfaceLayer } from "../../world";
import Board from "../../Board";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../../shared/src/collision";
import { registerDirtyRenderInfo } from "../../rendering/render-part-matrices";
import { playerInstance } from "../../player";
import { getHitboxVelocity, Hitbox, HitboxTether, setHitboxVelocity } from "../../hitboxes";
import { padHitboxDataExceptLocalID, readBoxFromData, readHitboxFromData, updateHitboxExceptLocalIDFromData } from "../../networking/packet-hitboxes";

export interface TransformComponentParams {
   readonly hitboxes: Array<Hitbox>;
   readonly collisionBit: CollisionBit;
   readonly collisionMask: number;
}

export interface TransformComponent {
   totalMass: number;
   
   readonly chunks: Set<Chunk>;

   hitboxes: Array<Hitbox>;
   readonly hitboxMap: Map<number, Hitbox>;

   readonly rootHitboxes: Array<Hitbox>;

   collisionBit: number;
   collisionMask: number;

   boundingAreaMinX: number;
   boundingAreaMaxX: number;
   boundingAreaMinY: number;
   boundingAreaMaxY: number;
}

const fillTransformComponentParams = (hitboxes: Array<Hitbox>, collisionBit: CollisionBit, collisionMask: number): TransformComponentParams => {
   return {
      hitboxes: hitboxes,
      collisionBit: collisionBit,
      collisionMask: collisionMask
   };
}

export function createTransformComponentParams(hitboxes: Array<Hitbox>): TransformComponentParams {
   return {
      hitboxes: hitboxes,
      collisionBit: CollisionBit.default,
      collisionMask: DEFAULT_COLLISION_MASK
   };
}

function createParamsFromData(reader: PacketReader): TransformComponentParams {
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();

   const hitboxes = new Array<Hitbox>();
   
   const numChildren = reader.readNumber();
   for (let i = 0; i < numChildren; i++) {
      const localID = reader.readNumber();
      const hitbox = readHitboxFromData(reader, localID, hitboxes);
      hitboxes.push(hitbox);
   }

   return fillTransformComponentParams(hitboxes, collisionBit, collisionMask);
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

const findEntityHitbox = (entity: Entity, localID: number): Hitbox | null => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   return getHitboxByLocalID(transformComponent.hitboxes, localID);
}

const addHitbox = (transformComponent: TransformComponent, hitbox: Hitbox): void => {
   transformComponent.hitboxes.push(hitbox);
   transformComponent.hitboxMap.set(hitbox.localID, hitbox);

   if (hitbox.parent === null) {
      transformComponent.rootHitboxes.push(hitbox);
   } else {
      // @CLEANUP: completely unnecessary??
      const parent = hitbox.parent;
      updateBox(hitbox.box, parent.box);
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

   // @Hack
   const hitbox = transformComponent.hitboxes[0];
   
   const tile = getHitboxTile(layer, hitbox);
   if (tile.type !== TileType.water) {
      return false;
   }

   
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

const cleanHitboxIncludingChildrenTransform = (hitbox: Hitbox): void => {
   if (hitbox.parent === null) {
      hitbox.box.angle = hitbox.box.relativeAngle;
   } else {
      updateBox(hitbox.box, hitbox.parent.box);
      // @Cleanup: maybe should be done in the updatebox function?? if it become updateHitbox??
      const parentVelocity = getHitboxVelocity(hitbox.parent);
      setHitboxVelocity(hitbox, parentVelocity.x, parentVelocity.y);
   }

   for (const childHitbox of hitbox.children) {
      cleanHitboxIncludingChildrenTransform(childHitbox);
   }
}

export function cleanEntityTransform(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   for (const rootHitbox of transformComponent.rootHitboxes) {
      cleanHitboxIncludingChildrenTransform(rootHitbox);
   }

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
   
   // @INCOMPLETE
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

   return {
      totalMass: totalMass,
      chunks: new Set(),
      hitboxes: transformComponentParams.hitboxes,
      hitboxMap: hitboxMap,
      rootHitboxes: rootHitboxes,
      collisionBit: transformComponentParams.collisionBit,
      collisionMask: transformComponentParams.collisionMask,
      boundingAreaMinX: Number.MAX_SAFE_INTEGER,
      boundingAreaMaxX: Number.MIN_SAFE_INTEGER,
      boundingAreaMinY: Number.MAX_SAFE_INTEGER,
      boundingAreaMaxY: Number.MIN_SAFE_INTEGER
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function onLoad(entity: Entity): void {
   cleanEntityTransform(entity);
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (const chunk of transformComponent.chunks) {
      chunk.removeEntity(entity);
   }
}

// @Cleanup: pointless... never gets called, ever
function padData(reader: PacketReader): void {
   // @Bug: I think this is off.... Length of entity data is wrong then?
   reader.padOffset(5 * Float32Array.BYTES_PER_ELEMENT);

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      padHitboxDataExceptLocalID(reader);

      const isTethered = reader.readBoolean();
      reader.padOffset(3);
      if (isTethered) {
         padHitboxDataExceptLocalID(reader);
         reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
      }
   }

   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   const numCarriedEntities = reader.readNumber();
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT * numCarriedEntities);
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

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const localID = reader.readNumber();

      const hitbox = transformComponent.hitboxMap.get(localID);
      if (typeof hitbox === "undefined") {
         const hitbox = readHitboxFromData(reader, localID, transformComponent.hitboxes);
         addHitbox(transformComponent, hitbox);
      } else {
         updateHitboxExceptLocalIDFromData(hitbox, reader);
      }
   }

   // Remove hitboxes which no longer exist
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitbox.lastUpdateTicks !== Board.serverTicks) {
         // Hitbox is removed!
         removeHitboxFromEntity(transformComponent, hitbox, i);
         i--;
      }
   }

   // @Speed
   transformComponent.totalMass = 0;
   for (const hitbox of transformComponent.hitboxes) {
      transformComponent.totalMass += hitbox.mass;
   }

   // Update containing chunks and bounds
   // @Copynpaste

   // @Speed
   // @Speed
   // @Speed

   transformComponent.boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   transformComponent.boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   transformComponent.boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   transformComponent.boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   const containingChunks = new Set<Chunk>();

   const layer = getEntityLayer(entity);
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;

      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();

      // Update bounding area
      if (minX < transformComponent.boundingAreaMinX) {
         transformComponent.boundingAreaMinX = minX;
      }
      if (maxX > transformComponent.boundingAreaMaxX) {
         transformComponent.boundingAreaMaxX = maxX;
      }
      if (minY < transformComponent.boundingAreaMinY) {
         transformComponent.boundingAreaMinY = minY;
      }
      if (maxY > transformComponent.boundingAreaMaxY) {
         transformComponent.boundingAreaMaxY = maxY;
      }

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
}

const updatePlayerHitboxFromData = (hitbox: Hitbox, parentEntity: Entity, reader: PacketReader): void => {
   // @Garbage
   const dataBox = readBoxFromData(reader);

   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);

   // Remove all previous tethers and add new ones

   hitbox.tethers.splice(0, hitbox.tethers.length);
   
   const numTethers = reader.readNumber();
   for (let i = 0; i < numTethers; i++) {
      const originBox = readBoxFromData(reader);
      const idealDistance = reader.readNumber();
      const springConstant = reader.readNumber();
      const damping = reader.readNumber();
      const tether: HitboxTether = {
         originBox: originBox,
         idealDistance: idealDistance,
         springConstant: springConstant,
         damping: damping
      };
      hitbox.tethers.push(tether);
   }
   
   reader.padOffset(6 * Float32Array.BYTES_PER_ELEMENT);
   
   const numFlags = reader.readNumber();
   reader.padOffset(numFlags * Float32Array.BYTES_PER_ELEMENT);

   reader.padOffset(Float32Array.BYTES_PER_ELEMENT) // entity
   hitbox.rootEntity = reader.readNumber();

   // @HACK @INCOMPLETE
   const parentLocalID = reader.readNumber();
   if (parentLocalID === -1) {
      hitbox.parent = null;
   } else {
      assert(entityExists(parentEntity));
      hitbox.parent = findEntityHitbox(parentEntity, parentLocalID);
      assert(hitbox.parent !== null);

      // If the player is attached to something, set the hitboxes' offset
      hitbox.box.offset.x = dataBox.offset.x;
      hitbox.box.offset.y = dataBox.offset.y;
   }

   reader.padOffset(Float32Array.BYTES_PER_ELEMENT); // isPartOfParent

   hitbox.lastUpdateTicks = Board.serverTicks;
}

function updatePlayerFromData(reader: PacketReader, isInitialData: boolean): void {
   if (isInitialData) {
      updateFromData(reader, playerInstance!);
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   const playerHitbox = transformComponent.hitboxes[0];
   const parentEntity = playerHitbox.parent !== null ? playerHitbox.parent.entity : 0;
   
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

   const numChildren = reader.readNumber();
   for (let i = 0; i < numChildren; i++) {
      const localID = reader.readNumber();
      const hitbox = transformComponent.hitboxMap.get(localID);
      assert(typeof hitbox !== "undefined");

      updatePlayerHitboxFromData(hitbox, parentEntity, reader);
   }
}

export function getRandomPositionInBox(box: Box): Point {
   if (boxIsCircular(box)) {
      const offsetMagnitude = box.radius * Math.random();
      const offsetDirection = randAngle();
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

const countHitboxesIncludingChildren = (hitbox: Hitbox): number => {
   let numHitboxes = 1;
   for (const childHitbox of hitbox.children) {
      if (childHitbox.isPartOfParent) {
         numHitboxes += countHitboxesIncludingChildren(childHitbox);
      }
   }
   return numHitboxes;
}

const countEntityHitboxes = (transformComponent: TransformComponent): number => {
   let numHitboxes = 0;
   for (const rootHitbox of transformComponent.rootHitboxes) {
      numHitboxes += countHitboxesIncludingChildren(rootHitbox);
   } 
   return numHitboxes;
}

const getHitboxHeirarchyIndexedHitbox = (hitbox: Hitbox, i: number, hitboxIdx: number): Hitbox | number => {
   let newI = i;

   if (newI === hitboxIdx) {
      return hitbox;
   }
   
   newI++;

   for (const childHitbox of hitbox.children) {
      const result = getHitboxHeirarchyIndexedHitbox(childHitbox, newI, hitboxIdx);
      if (typeof result === "number") {
         newI = result;
      } else {
         return result;
      }
   }
   
   return newI;
}

const getEntityHeirarchyIndexedHitbox = (transformComponent: TransformComponent, i: number, hitboxIdx: number): Hitbox | number => {
   let _i = 0;

   for (const rootHitbox of transformComponent.rootHitboxes) {
      const result = getHitboxHeirarchyIndexedHitbox(rootHitbox, _i, hitboxIdx);
      if (typeof result === "number") {
         _i = result;
      } else {
         return result;
      }
   }

   throw new Error();
}

export function getRandomPositionInEntity(transformComponent: TransformComponent): Point {
   const numHitboxes = countEntityHitboxes(transformComponent);
   const hitboxIdx = Math.floor(Math.random() * numHitboxes);
   
   const hitbox = getEntityHeirarchyIndexedHitbox(transformComponent, 0, hitboxIdx);
   if (typeof hitbox === "number") {
      throw new Error();
   }
   return getRandomPositionInBox(hitbox.box);
}

export function getRandomPositionOnBoxEdge(box: Box): Point {
   if (boxIsCircular(box)) {
      const offsetMagnitude = box.radius;
      const offsetDirection = randAngle();
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