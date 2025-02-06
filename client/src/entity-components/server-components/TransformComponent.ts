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
import { boxIsCircular, hitboxIsCircular, updateBox, HitboxFlag, updateVertexPositionsAndSideAxes, Box, Hitbox, BoxType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import Layer, { getTileIndexIncludingEdges } from "../../Layer";
import { entityExists, getCurrentLayer, getEntityLayer, getEntityRenderInfo, playerInstance } from "../../world";
import { ClientHitbox } from "../../boxes";
import Board from "../../Board";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { HitboxCollisionBit } from "../../../../shared/src/collision";
import { EntityConfig } from "../ComponentArray";
import { registerDirtyRenderInfo, registerDirtyRenderPosition } from "../../rendering/render-part-matrices";
import { playSound } from "../../sound";
import Camera from "../../Camera";

export interface HitboxTether {
   readonly hitbox: Hitbox;
   readonly otherHitbox: Hitbox;
}

export interface EntityCarryInfo {
   readonly carriedEntity: Entity;
   readonly offsetX: number;
   readonly offsetY: number;
}

export interface TransformComponentParams {
   readonly position: Point;
   readonly rotation: number;
   readonly hitboxes: Array<ClientHitbox>;
   readonly rootHitboxes: Array<ClientHitbox>;
   readonly tethers: Array<HitboxTether>;
   readonly collisionBit: HitboxCollisionBit;
   readonly collisionMask: number;
   readonly carryRoot: Entity;
   readonly mount: Entity;
   readonly carriedEntities: Array<EntityCarryInfo>;
}

export interface TransformComponent {
   totalMass: number;
   
   readonly position: Point;

   /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
   rotation: number;

   readonly chunks: Set<Chunk>;

   hitboxes: Array<ClientHitbox>;
   readonly hitboxMap: Map<number, ClientHitbox>;

   readonly rootHitboxes: Array<ClientHitbox>;
   readonly tethers: Array<HitboxTether>;

   collisionBit: number;
   collisionMask: number;

   boundingAreaMinX: number;
   boundingAreaMaxX: number;
   boundingAreaMinY: number;
   boundingAreaMaxY: number;

   carryRoot: Entity;
   mount: Entity;
   // @Cleanup: should be readonly
   carriedEntities: Array<EntityCarryInfo>;
}

const padBaseHitboxData = (reader: PacketReader): void => {
   reader.padOffset(11 * Float32Array.BYTES_PER_ELEMENT);

   const numFlags = reader.readNumber();
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT * numFlags);

   // Parent local ID
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

const getHitboxByLocalID = (hitboxes: ReadonlyArray<ClientHitbox>, localID: number): ClientHitbox | null => {
   if (localID === -1) {
      return null;
   }

   for (const hitbox of hitboxes) {
      if (hitbox.localID === localID) {
         return hitbox;
      }
   }

   throw new Error();
}

export function readCircularHitboxFromData(reader: PacketReader, hitboxes: ReadonlyArray<ClientHitbox>, localID: number): ClientHitbox<BoxType.circular> {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeRotation = reader.readNumber();
   const rotation = reader.readNumber();
   const mass = reader.readNumber();
   const offsetX = reader.readNumber();
   const offsetY = reader.readNumber();
   const scale = reader.readNumber();
   const collisionType = reader.readNumber();
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();

   const numFlags = reader.readNumber();
   const flags = new Array<HitboxFlag>();
   for (let i = 0; i < numFlags; i++) {
      flags.push(reader.readNumber());
   }

   const parentLocalID = reader.readNumber();
   const parentHitbox = getHitboxByLocalID(hitboxes, parentLocalID);

   const radius = reader.readNumber();

   const offset = new Point(offsetX, offsetY);
   const box = new CircularBox(parentHitbox !== null ? parentHitbox.box : null, offset, 0, radius);
   // @Hack
   box.scale = scale;
   box.position.x = x;
   box.position.y = y;
   box.relativeRotation = relativeRotation;
   box.rotation = rotation;
   
   return new ClientHitbox(box, mass, collisionType, collisionBit, collisionMask, flags, localID);
}
const padCircularHitboxData = (reader: PacketReader): void => {
   padBaseHitboxData(reader);
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

export function readRectangularHitboxFromData(reader: PacketReader, hitboxes: ReadonlyArray<ClientHitbox>, localID: number): ClientHitbox<BoxType.rectangular> {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeRotation = reader.readNumber();
   const rotation = reader.readNumber();
   const mass = reader.readNumber();
   const offsetX = reader.readNumber();
   const offsetY = reader.readNumber();
   const scale = reader.readNumber();
   const collisionType = reader.readNumber();
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();

   const numFlags = reader.readNumber();
   const flags = new Array<HitboxFlag>();
   for (let i = 0; i < numFlags; i++) {
      flags.push(reader.readNumber());
   }

   const parentLocalID = reader.readNumber();
   const parentHitbox = getHitboxByLocalID(hitboxes, parentLocalID);
   
   const width = reader.readNumber();
   const height = reader.readNumber();

   const offset = new Point(offsetX, offsetY);
   const box = new RectangularBox(parentHitbox !== null ? parentHitbox.box : null, offset, width, height, rotation);
   // @Hack
   box.scale = scale;
   box.position.x = x;
   box.position.y = y;
   box.relativeRotation = relativeRotation;
   box.rotation = rotation;

   return new ClientHitbox(box, mass, collisionType, collisionBit, collisionMask, flags, localID);
}
const padRectangularHitboxData = (reader: PacketReader): void => {
   padBaseHitboxData(reader);
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

export function createTransformComponentParams(position: Point, rotation: number, hitboxes: Array<ClientHitbox>, tethers: Array<HitboxTether>, rootHitboxes: Array<ClientHitbox>, collisionBit: HitboxCollisionBit, collisionMask: number, carryRoot: Entity, mount: Entity, carriedEntities: Array<EntityCarryInfo>): TransformComponentParams {
   return {
      position: position,
      rotation: rotation,
      hitboxes: hitboxes,
      tethers: tethers,
      rootHitboxes: rootHitboxes,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      carryRoot: carryRoot,
      mount: mount,
      carriedEntities: carriedEntities
   };
}

export function createParamsFromData(reader: PacketReader): TransformComponentParams {
   const positionX = reader.readNumber();
   const positionY = reader.readNumber();
   const position = new Point(positionX, positionY);

   const rotation = reader.readNumber();
   
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();

   const hitboxes = new Array<ClientHitbox>();
   const tethers = new Array<HitboxTether>();
   const rootHitboxes = new Array<ClientHitbox>();
   
   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const isCircular = reader.readBoolean();
      reader.padOffset(3);

      const localID = reader.readNumber();

      let hitbox: ClientHitbox;
      if (isCircular) {
         hitbox = readCircularHitboxFromData(reader, hitboxes, localID);
      } else {
         hitbox = readRectangularHitboxFromData(reader, hitboxes, localID);
      }

      hitboxes.push(hitbox);
      if (hitbox.box.parent === null) {
         rootHitboxes.push(hitbox);
      }

      const isTethered = reader.readBoolean();
      reader.padOffset(3);
      if (isTethered) {
         const otherHitboxLocalID = reader.readNumber();
         const otherHitbox = getHitboxByLocalID(hitboxes, otherHitboxLocalID);
         assert(otherHitbox !== null);

         const tether: HitboxTether = {
            hitbox: hitbox,
            otherHitbox: otherHitbox
         };
         tethers.push(tether);
      }
   }

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
         offsetY: offsetY
      };
      carriedEntities.push(carryInfo);
   }

   return createTransformComponentParams(position, rotation, hitboxes, tethers, rootHitboxes, collisionBit, collisionMask, carryRoot, mount, carriedEntities);
}

export function getEntityTile(layer: Layer, transformComponent: TransformComponent): Tile {
   const tileX = Math.floor(transformComponent.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(transformComponent.position.y / Settings.TILE_SIZE);
   
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   return layer.getTile(tileIndex);
}

const getHitboxLocalID = (transformComponent: TransformComponent, hitbox: ClientHitbox): number => {
   for (const pair of transformComponent.hitboxMap) {
      if (pair[1] === hitbox) {
         return pair[0];
      }
   }

   throw new Error();
}

const addHitbox = (transformComponent: TransformComponent, hitbox: ClientHitbox): void => {
   updateBox(hitbox.box, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);
   transformComponent.hitboxes.push(hitbox);
   transformComponent.hitboxMap.set(hitbox.localID, hitbox);

   if (hitbox.box.parent === null) {
      transformComponent.rootHitboxes.push(hitbox);
   }
}
   
export function removeHitboxFromEntity(transformComponent: TransformComponent, hitbox: ClientHitbox, idx: number): void {
   transformComponent.hitboxes.splice(idx, 1);
   const localID = getHitboxLocalID(transformComponent, hitbox);
   transformComponent.hitboxMap.delete(localID);

   if (hitbox.box.parent === null) {
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

   // If the game object is standing on a stepping stone they aren't in a river
   for (const chunk of transformComponent.chunks) {
      for (const steppingStone of chunk.riverSteppingStones) {
         const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
         
         const dist = distance(transformComponent.position.x, transformComponent.position.y, steppingStone.positionX, steppingStone.positionY);
         if (dist <= size/2) {
            return false;
         }
      }
   }

   return true;
}

// @Hack: THIS SHIT STINKY
const getHitboxByBox = (transformComponent: TransformComponent, box: Box): ClientHitbox => {
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.box === box) {
         return hitbox;
      }
   }

   throw new Error();
}

// @Cleanup: name is bad, doesn't fully 'clean' the hitbox.
const cleanHitbox = (transformComponent: TransformComponent, hitbox: ClientHitbox, parentPosition: Readonly<Point>, parentRotation: number): void => {
   updateBox(hitbox.box, parentPosition.x, parentPosition.y, parentRotation);

   for (const child of hitbox.box.children) {
      const childHitbox = getHitboxByBox(transformComponent, child);
      cleanHitbox(transformComponent, childHitbox, hitbox.box.position, hitbox.box.rotation);
   }
}

const updateHitboxes = (transformComponent: TransformComponent): void => {
   let rotation = transformComponent.rotation;
   if (entityExists(transformComponent.mount)) {
      const mountTransformComponent = TransformComponentArray.getComponent(transformComponent.mount);
      rotation += mountTransformComponent.rotation;
   }
   for (const hitbox of transformComponent.rootHitboxes) {
      cleanHitbox(transformComponent, hitbox, transformComponent.position, rotation);
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
   updateHitboxes(transformComponent);
   updateContainingChunks(transformComponent, entity);
}

export const TransformComponentArray = new ServerComponentArray<TransformComponent, TransformComponentParams, never>(ServerComponentType.transform, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onLoad: onLoad,
   onRemove: onRemove,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

function createComponent(entityConfig: EntityConfig<ServerComponentType.transform, never>): TransformComponent {
   const transformComponentParams = entityConfig.serverComponents[ServerComponentType.transform];
   
   let totalMass = 0;
   const hitboxMap = new Map<number, ClientHitbox>();
   for (const hitbox of transformComponentParams.hitboxes) {
      totalMass += hitbox.mass;
      hitboxMap.set(hitbox.localID, hitbox);
   }
   
   return {
      totalMass: totalMass,
      position: transformComponentParams.position,
      rotation: transformComponentParams.rotation,
      chunks: new Set(),
      hitboxes: transformComponentParams.hitboxes,
      hitboxMap: hitboxMap,
      tethers: transformComponentParams.tethers,
      rootHitboxes: transformComponentParams.rootHitboxes,
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
   // @Bug: This should be 7...? Length of entity data is wrong then?
   reader.padOffset(5 * Float32Array.BYTES_PER_ELEMENT);

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const isCircular = reader.readBoolean();
      reader.padOffset(3);

      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

      if (isCircular) {
         padCircularHitboxData(reader);
      } else {
         padRectangularHitboxData(reader);
      }

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

const updateBaseHitbox = (hitbox: ClientHitbox, reader: PacketReader): void => {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeRotation = reader.readNumber();
   const rotation = reader.readNumber();
   // @Incomplete: Unused
   const mass = reader.readNumber();
   const offsetX = reader.readNumber();
   const offsetY = reader.readNumber();
   const scale = reader.readNumber();
   const collisionType = reader.readNumber();
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();
   const numFlags = reader.readNumber();
   // @Speed @Garbage
   const flags = new Array<HitboxFlag>();
   for (let i = 0; i < numFlags; i++) {
      flags.push(reader.readNumber());
   }

   // Skip parent local ID
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

   const box = hitbox.box;
   
   box.position.x = x;
   box.position.y = y;
   box.relativeRotation = relativeRotation;
   box.rotation = rotation;
   box.offset.x = offsetX;
   box.offset.y = offsetY;
   box.scale = scale;
   hitbox.collisionType = collisionType;
   hitbox.lastUpdateTicks = Board.serverTicks;
}

const updateCircularHitbox = (clientHitbox: ClientHitbox<BoxType.circular>, reader: PacketReader): void => {
   updateBaseHitbox(clientHitbox, reader);

   clientHitbox.box.radius = reader.readNumber();
}

const updateRectangularHitbox = (clientHitbox: ClientHitbox<BoxType.rectangular>, reader: PacketReader): void => {
   updateBaseHitbox(clientHitbox, reader);

   clientHitbox.box.width = reader.readNumber();
   clientHitbox.box.height = reader.readNumber();
   
   updateVertexPositionsAndSideAxes(clientHitbox.box);
}
   
function updateFromData(reader: PacketReader, entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const positionX = reader.readNumber();
   const positionY = reader.readNumber();
   const rotation = reader.readNumber();

   if (positionX !== transformComponent.position.x || positionY !== transformComponent.position.y || rotation !== transformComponent.rotation) {
      transformComponent.position.x = positionX;
      transformComponent.position.y = positionY;
      transformComponent.rotation = rotation;
      
      const renderInfo = getEntityRenderInfo(entity);
      registerDirtyRenderInfo(renderInfo);
      registerDirtyRenderPosition(renderInfo);
   }
   
   transformComponent.collisionBit = reader.readNumber();
   transformComponent.collisionMask = reader.readNumber();

   // @Speed: would be faster if we split the hitboxes array
   let existingNumCircular = 0;
   let existingNumRectangular = 0;
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitboxIsCircular(hitbox)) {
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
      const isCircular = reader.readBoolean();
      reader.padOffset(3);

      const localID = reader.readNumber();

      const hitbox = transformComponent.hitboxMap.get(localID);
      if (typeof hitbox === "undefined") {
         // Create new hitbox
         let hitbox: ClientHitbox;
         if (isCircular) {
            hitbox = readCircularHitboxFromData(reader, transformComponent.hitboxes, localID);

            newNumCircular++;
            hasAddedCircular = true;
         } else {
            hitbox = readRectangularHitboxFromData(reader, transformComponent.hitboxes, localID);

            newNumRectangular++;
            hasAddedRectangular = true;
         }

         addHitbox(transformComponent, hitbox);

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
         if (isCircular) {
            // @Hack: Cast
            updateCircularHitbox(hitbox as ClientHitbox<BoxType.circular>, reader);

            newNumCircular++;
         } else {
            // @Hack: Cast
            updateRectangularHitbox(hitbox as ClientHitbox<BoxType.rectangular>, reader);

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

   transformComponent.carryRoot = reader.readNumber();
   transformComponent.mount = reader.readNumber();
   // @Speed
   const carriedEntities = new Array<EntityCarryInfo>();
   const numCarriedEntities = reader.readNumber();
   for (let i = 0; i < numCarriedEntities; i++) {
      const carriedEntity = reader.readNumber();
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();

      // @Copynpaste
      const carryInfo: EntityCarryInfo = {
         carriedEntity: carriedEntity,
         offsetX: offsetX,
         offsetY: offsetY
      };
      carriedEntities.push(carryInfo);
   }

   // Unmount the player when the player is no longer being carried
   // @Speed
   const wasCarryingPlayer = transformComponent.carriedEntities.some(carryInfo => carryInfo.carriedEntity === playerInstance);
   const isCarryingPlayer = carriedEntities.some(carryInfo => carryInfo.carriedEntity === playerInstance);
   if (wasCarryingPlayer && !isCarryingPlayer) {
      const playerTransformComponent = TransformComponentArray.getComponent(playerInstance!);
      // @Hack @Hardcoded
      playerTransformComponent.position.x += rotateXAroundOrigin(48, 0, transformComponent.rotation);
      playerTransformComponent.position.y += rotateYAroundOrigin(48, 0, transformComponent.rotation);

      playSound("mount.mp3", 0.4, 1, Camera.position.copy(), getCurrentLayer());
   } else if (!wasCarryingPlayer && isCarryingPlayer) {
      playSound("dismount.mp3", 0.4, 1, Camera.position.copy(), getCurrentLayer());
   }

   transformComponent.carriedEntities = carriedEntities;
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
   reader.padOffset(5 * Float32Array.BYTES_PER_ELEMENT);

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const isCircular = reader.readBoolean();
      reader.padOffset(3);

      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

      if (isCircular) {
         padCircularHitboxData(reader);
      } else {
         padRectangularHitboxData(reader);
      }

      const isTethered = reader.readBoolean();
      reader.padOffset(3);
      if (isTethered) {
         reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      }
   }

   const transformComponent = TransformComponentArray.getComponent(playerInstance!);

   // @Copynpaste from updateFromData
   
   transformComponent.carryRoot = reader.readNumber();
   transformComponent.mount = reader.readNumber();
   // @Speed
   const carriedEntities = new Array<EntityCarryInfo>();
   const numCarriedEntities = reader.readNumber();
   for (let i = 0; i < numCarriedEntities; i++) {
      const carriedEntity = reader.readNumber();
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();

      // @Copynpaste
      const carryInfo: EntityCarryInfo = {
         carriedEntity: carriedEntity,
         offsetX: offsetX,
         offsetY: offsetY
      };
      carriedEntities.push(carryInfo);
   }
   transformComponent.carriedEntities = carriedEntities;
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

      const x = box.position.x + rotateXAroundOrigin(xOffset, yOffset, box.rotation);
      const y = box.position.y + rotateYAroundOrigin(xOffset, yOffset, box.rotation);
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

      const x = box.position.x + rotateXAroundOrigin(xOffset, yOffset, box.rotation);
      const y = box.position.y + rotateYAroundOrigin(xOffset, yOffset, box.rotation);
      return new Point(x, y);
   }
}