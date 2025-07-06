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
import { ComponentArray } from "../ComponentArray";

export interface EntityAttachInfo {
   readonly attachedEntity: Entity;
   readonly parent: Hitbox | null;
   lastUpdateTicks: number;
}

const enum TransformNodeType {
   hitbox,
   entity
}

export type TransformNode = Hitbox | EntityAttachInfo;

export interface TransformComponentParams {
   readonly rootEntity: Entity;
   readonly parentEntity: Entity;
   readonly children: Array<TransformNode>;
   readonly collisionBit: CollisionBit;
   readonly collisionMask: number;
}

export interface TransformComponent {
   totalMass: number;
   
   readonly chunks: Set<Chunk>;

   children: Array<TransformNode>;
   readonly hitboxMap: Map<number, Hitbox>;

   readonly rootChildren: Array<TransformNode>;

   collisionBit: number;
   collisionMask: number;

   boundingAreaMinX: number;
   boundingAreaMaxX: number;
   boundingAreaMinY: number;
   boundingAreaMaxY: number;

   rootEntity: Entity;
   parentEntity: Entity;
}

const fillTransformComponentParams = (rootEntity: Entity, parentEntity: Entity, children: Array<TransformNode>, collisionBit: CollisionBit, collisionMask: number): TransformComponentParams => {
   return {
      children: children,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      rootEntity: rootEntity,
      parentEntity: parentEntity
   };
}

export function createTransformComponentParams(children: Array<TransformNode>): TransformComponentParams {
   return {
      children: children,
      collisionBit: CollisionBit.default,
      collisionMask: DEFAULT_COLLISION_MASK,
      rootEntity: 0,
      parentEntity: 0
   };
}

const readEntityAttachInfo = (reader: PacketReader, children: Array<TransformNode>): EntityAttachInfo => {
   const attachedEntity = reader.readNumber();

   const parentHitboxLocalID = reader.readNumber();

   let parent: Hitbox | null;
   if (parentHitboxLocalID !== -1) {
      parent = getHitboxByLocalID(children, parentHitboxLocalID);
      if (parent === null) {
         throw new Error();
      }
   } else {
      parent = null;
   }
   return {
      attachedEntity: attachedEntity,
      parent: parent,
      lastUpdateTicks: Board.serverTicks
   };
}

function createParamsFromData(reader: PacketReader): TransformComponentParams {
   const rootEntity = reader.readNumber();
   const parentEntity = reader.readNumber();
   
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();

   const children = new Array<TransformNode>();
   
   const numChildren = reader.readNumber();
   for (let i = 0; i < numChildren; i++) {
      const nodeType = reader.readNumber() as TransformNodeType;
      if (nodeType === TransformNodeType.entity) {
         const attachInfo = readEntityAttachInfo(reader, children);
         children.push(attachInfo);
      } else {
         const localID = reader.readNumber();
   
         const hitbox = readHitboxFromData(reader, localID, children);
         children.push(hitbox);
      }
   }

   return fillTransformComponentParams(rootEntity, parentEntity, children, collisionBit, collisionMask);
}

// @Location
export function getHitboxTile(layer: Layer, hitbox: Hitbox): Tile {
   const tileX = Math.floor(hitbox.box.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(hitbox.box.position.y / Settings.TILE_SIZE);
   
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   return layer.getTile(tileIndex);
}

export function entityChildIsHitbox(child: Hitbox | EntityAttachInfo): child is Hitbox {
   return typeof (child as Hitbox).mass !== "undefined";
}

export function entityChildIsEntity(child: Hitbox | EntityAttachInfo): child is EntityAttachInfo {
   return typeof (child as EntityAttachInfo).attachedEntity !== "undefined";
}

export function getHitboxByLocalID(children: ReadonlyArray<TransformNode>, localID: number): Hitbox | null {
   for (const child of children) {
      if (entityChildIsHitbox(child) && child.localID === localID) {
         return child;
      }
   }
   return null;
}

const findEntityHitbox = (entity: Entity, localID: number): Hitbox | null => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   return getHitboxByLocalID(transformComponent.children, localID);
}

const addAttachInfo = (transformComponent: TransformComponent, attachInfo: EntityAttachInfo): void => {
   transformComponent.children.push(attachInfo);

   if (attachInfo.parent === null) {
      transformComponent.rootChildren.push(attachInfo);
   }
}

const addHitbox = (transformComponent: TransformComponent, hitbox: Hitbox): void => {
   transformComponent.children.push(hitbox);
   transformComponent.hitboxMap.set(hitbox.localID, hitbox);

   if (hitbox.parent === null) {
      transformComponent.rootChildren.push(hitbox);
   } else {
      // @CLEANUP: completely unnecessary??
      const parent = hitbox.parent;
      updateBox(hitbox.box, parent.box);
   }
}

const removeEntityAttachInfoFromEntity = (transformComponent: TransformComponent, attachInfo: EntityAttachInfo, idx: number): void => {
   transformComponent.children.splice(idx, 1);

   if (attachInfo.parent === null) {
      const idx = transformComponent.rootChildren.indexOf(attachInfo);
      if (idx !== -1) {
         transformComponent.rootChildren.splice(idx, 1);
      } else {
         console.warn("Tried to remove a root child from the root children array... but wasn't there!")
      }
   }
}
   
export function removeHitboxFromEntity(transformComponent: TransformComponent, hitbox: Hitbox, idx: number): void {
   transformComponent.children.splice(idx, 1);
   transformComponent.hitboxMap.delete(hitbox.localID);

   if (hitbox.parent === null) {
      const idx = transformComponent.rootChildren.indexOf(hitbox);
      assert(idx !== -1);
      transformComponent.rootChildren.splice(idx, 1);
   }
}

export function entityIsInRiver(transformComponent: TransformComponent, entity: Entity): boolean {
   const layer = getEntityLayer(entity);

   // @Hack
   const hitbox = transformComponent.children[0];
   if (!entityChildIsHitbox(hitbox)) {
      return false;
   }
   
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
   for (const hitbox of transformComponent.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }
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

export function cleanTransform(node: Hitbox | Entity): void {
   if (typeof node !== "number") {
      const hitbox = node;
      if (hitbox.parent === null) {
         hitbox.box.angle = hitbox.box.relativeAngle;
      } else {
         updateBox(hitbox.box, hitbox.parent.box);
         // @Cleanup: maybe should be done in the updatebox function?? if it become updateHitbox??
         const parentVelocity = getHitboxVelocity(hitbox.parent);
         setHitboxVelocity(hitbox, parentVelocity.x, parentVelocity.y);
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
      if (!TransformComponentArray.hasComponent(entity)) {
         return;
      }
      const transformComponent = TransformComponentArray.getComponent(entity);
      
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
   
      for (const hitbox of transformComponent.children) {
         if (!entityChildIsHitbox(hitbox)) {
            continue;
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
      }
   
      updateContainingChunks(transformComponent, entity);
   }
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
   const rootChildren = new Array<TransformNode>();
   const hitboxMap = new Map<number, Hitbox>();
   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }
      totalMass += hitbox.mass;
      hitboxMap.set(hitbox.localID, hitbox);
      if (hitbox.parent === null) {
         rootChildren.push(hitbox);
      }
   }

   return {
      totalMass: totalMass,
      chunks: new Set(),
      children: transformComponentParams.children,
      hitboxMap: hitboxMap,
      rootChildren: rootChildren,
      collisionBit: transformComponentParams.collisionBit,
      collisionMask: transformComponentParams.collisionMask,
      boundingAreaMinX: Number.MAX_SAFE_INTEGER,
      boundingAreaMaxX: Number.MIN_SAFE_INTEGER,
      boundingAreaMinY: Number.MAX_SAFE_INTEGER,
      boundingAreaMaxY: Number.MIN_SAFE_INTEGER,
      rootEntity: transformComponentParams.rootEntity,
      parentEntity: transformComponentParams.parentEntity
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function onLoad(entity: Entity): void {
   cleanTransform(entity);
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
   reader.padOffset(7 * Float32Array.BYTES_PER_ELEMENT);

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

const getExistingAttachInfo = (transformComponent: TransformComponent, attachedEntity: Entity): EntityAttachInfo | null => {
   for (const child of transformComponent.children) {
      if (entityChildIsEntity(child) && child.attachedEntity === attachedEntity) {
         return child;
      }
   }
   return null;
}
   
function updateFromData(reader: PacketReader, entity: Entity): void {
   // @SPEED: What we could do is explicitly send which hitboxes have been created, and removed, from the server. (When using carmack networking)
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // @HACK @SPEED? (actually this might be ok just if we do the optimisation which only sends components which were updated, not all of em at once)
   const renderInfo = getEntityRenderInfo(entity);
   registerDirtyRenderInfo(renderInfo);
   
   transformComponent.rootEntity = reader.readNumber();
   transformComponent.parentEntity = reader.readNumber();
   
   transformComponent.collisionBit = reader.readNumber();
   transformComponent.collisionMask = reader.readNumber();

   // @Speed: would be faster if we split the hitboxes array
   let existingNumCircular = 0;
   let existingNumRectangular = 0;
   for (let i = 0; i < transformComponent.children.length; i++) {
      const hitbox = transformComponent.children[i];
      if (entityChildIsHitbox(hitbox)) {
         if (boxIsCircular(hitbox.box)) {
            existingNumCircular++;
         } else {
            existingNumRectangular++;
         }
      }
   }

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const nodeType = reader.readNumber() as TransformNodeType;

      if (nodeType === TransformNodeType.entity) {
         const attachedEntity = reader.readNumber();
         
         const existingAttachInfo = getExistingAttachInfo(transformComponent, attachedEntity);
         if (existingAttachInfo !== null) {
            reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

            existingAttachInfo.lastUpdateTicks = Board.serverTicks;
         } else {
            // @Copynpaste

            const parentHitboxLocalID = reader.readNumber();
         
            let parent: Hitbox | null;
            if (parentHitboxLocalID !== -1) {
               parent = getHitboxByLocalID(transformComponent.children, parentHitboxLocalID);
               if (parent === null) {
                  throw new Error();
               }
            } else {
               parent = null;
            }

            const attachInfo: EntityAttachInfo = {
               attachedEntity: attachedEntity,
               parent: parent,
               lastUpdateTicks: Board.serverTicks
            };
            addAttachInfo(transformComponent, attachInfo);
         }
      } else {
         const localID = reader.readNumber();
   
         const hitbox = transformComponent.hitboxMap.get(localID);
         if (typeof hitbox === "undefined") {
            const hitbox = readHitboxFromData(reader, localID, transformComponent.children);
            addHitbox(transformComponent, hitbox);
         } else {
            updateHitboxExceptLocalIDFromData(hitbox, reader);
         }
      }
   }

   // Remove children which no longer exist
   for (let i = 0; i < transformComponent.children.length; i++) {
      const child = transformComponent.children[i];
      if (entityChildIsEntity(child)) {
         const attachInfo = child;
         if (attachInfo.lastUpdateTicks !== Board.serverTicks) {
            removeEntityAttachInfoFromEntity(transformComponent, attachInfo, i);
            i--;
         }
      } else {
         const hitbox = child;
         if (hitbox.lastUpdateTicks !== Board.serverTicks) {
            // Hitbox is removed!
            removeHitboxFromEntity(transformComponent, hitbox, i);
            i--;
         }
      }
   }

   // @Speed
   transformComponent.totalMass = 0;
   for (const hitbox of transformComponent.children) {
      if (entityChildIsHitbox(hitbox)) {
         transformComponent.totalMass += hitbox.mass;
      }
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
   for (const hitbox of transformComponent.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }
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

   hitbox.lastUpdateTicks = Board.serverTicks;
}

function updatePlayerFromData(reader: PacketReader, isInitialData: boolean): void {
   if (isInitialData) {
      updateFromData(reader, playerInstance!);
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   transformComponent.rootEntity = reader.readNumber();
   transformComponent.parentEntity = reader.readNumber();
   
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

   const numChildren = reader.readNumber();
   for (let i = 0; i < numChildren; i++) {
      const nodeType = reader.readNumber() as TransformNodeType;

      if (nodeType === TransformNodeType.entity) {
         reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
      } else {
         const localID = reader.readNumber();
         const hitbox = transformComponent.hitboxMap.get(localID);
         assert(typeof hitbox !== "undefined");

         updatePlayerHitboxFromData(hitbox, transformComponent.parentEntity, reader);
      }
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