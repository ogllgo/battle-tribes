import { Settings } from "battletribes-shared/settings";
import { blockerIsCircluar } from "battletribes-shared/grass-blockers";
import Chunk from "./Chunk";
import { Entity } from "battletribes-shared/entities";
import { TransformComponentArray } from "./components/TransformComponent";
import { boxIsCircular, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { entityExists, getEntityLayer } from "./world";
import { surfaceLayer } from "./layers";
import { Packet } from "../../shared/src/packets";
import { distance, Point, pointIsInRectangle, unitsToChunksClamped } from "../../shared/src/utils";
import Layer from "./Layer";

const enum Vars {
   GRASS_FULL_REGROW_TICKS = Settings.TPS * 120,
   GRASS_FULL_DIE_TICKS = Settings.TPS * 20,
   STRUCTURE_BLOCKER_PADDING = -4
}

interface BaseGrassBlocker {
   readonly id: number;
   readonly position: Readonly<Point>;
   readonly layer: Layer;
   /** Amount of grass that the blocker blocks (from 0 -> 1) */
   blockAmount: number;
   // @Bandwidth: unnecessary
   readonly maxBlockAmount: number;
}

export interface GrassBlockerRectangle extends BaseGrassBlocker {
   readonly width: number;
   readonly height: number;
   readonly rotation: number;
}

export interface GrassBlockerCircle extends BaseGrassBlocker {
   readonly radius: number;
}

export type GrassBlocker = GrassBlockerRectangle | GrassBlockerCircle;

let nextID = 0;

const blockers = new Array<GrassBlocker>();
const blockerAssociatedEntities = new Array<Entity>();

const getBlockerChunks = (blocker: GrassBlocker): ReadonlyArray<Chunk> => {
   let minX: number;
   let maxX: number;
   let minY: number;
   let maxY: number;
   if (blockerIsCircluar(blocker)) {
      minX = blocker.position.x - blocker.radius;
      maxX = blocker.position.x + blocker.radius;
      minY = blocker.position.y - blocker.radius;
      maxY = blocker.position.y + blocker.radius;
   } else {
      minX = blocker.position.x - blocker.width * 0.5;
      maxX = blocker.position.x + blocker.width * 0.5;
      minY = blocker.position.y - blocker.height * 0.5;
      maxY = blocker.position.y + blocker.height * 0.5;
   }
   
   const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   const chunks = new Array<Chunk>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = surfaceLayer.getChunk(chunkX, chunkY);
         chunks.push(chunk);
      }
   }

   return chunks;
}

const addGrassBlocker = (blocker: GrassBlocker, associatedEntityID: number): void => {
   const chunks = getBlockerChunks(blocker);
   for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      chunk.grassBlockers.push(blocker);
   }

   blockers.push(blocker);
   blockerAssociatedEntities.push(associatedEntityID);
}

export function createCircularGrassBlocker(position: Readonly<Point>, layer: Layer, initialBlockAmount: number, maxBlockAmount: number, radius: number, associatedEntity: Entity): void {
   const blocker: GrassBlockerCircle = {
      id: nextID++,
      position: position,
      layer: layer,
      blockAmount: initialBlockAmount,
      maxBlockAmount: maxBlockAmount,
      radius: radius
   };
   addGrassBlocker(blocker, associatedEntity);
}

export function createRectangularGrassBlocker(position: Readonly<Point>, layer: Layer, initialBlockAmount: number, maxBlockAmount: number, width: number, height: number, rotation: number, associatedEntity: Entity): void {
   const blocker: GrassBlockerRectangle = {
      id: nextID++,
      position: position,
      layer: layer,
      blockAmount: initialBlockAmount,
      maxBlockAmount: maxBlockAmount,
      width: width,
      height: height,
      rotation: rotation
   };
   addGrassBlocker(blocker, associatedEntity);
}

const removeGrassBlocker = (blocker: GrassBlocker, i: number): void => {
   const chunks = getBlockerChunks(blocker);
   for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const idx = chunk.grassBlockers.indexOf(blocker);
      if (idx !== -1) {
         chunk.grassBlockers.splice(idx, 1);
      }
   }

   // @Speed: swap with last instead
   blockers.splice(i, 1);
   blockerAssociatedEntities.splice(i, 1);
}

export function updateGrassBlockers(): void {
   for (let i = 0; i < blockers.length; i++) {
      const blocker = blockers[i];
      
      const associatedEntity = blockerAssociatedEntities[i];
      if (entityExists(associatedEntity)) {
         blocker.blockAmount += 1 / Vars.GRASS_FULL_DIE_TICKS;
         if (blocker.blockAmount > blocker.maxBlockAmount) {
            blocker.blockAmount = blocker.maxBlockAmount;
         }
      } else {
         blocker.blockAmount -= 1 / Vars.GRASS_FULL_REGROW_TICKS;
         if (blocker.blockAmount <= 0) {
            removeGrassBlocker(blocker, i);
            i--;
         }
      }
   }
}

export function createStructureGrassBlockers(structure: Entity): void {
   const layer = getEntityLayer(structure);
   const transformComponent = TransformComponentArray.getComponent(structure);
   
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitbox.flags.includes(HitboxFlag.NON_GRASS_BLOCKING)) {
         continue;
      }

      const box = hitbox.box;

      const position = transformComponent.position.copy();
      position.x += box.offset.x;
      position.y += box.offset.y;

      if (boxIsCircular(box)) {
         createCircularGrassBlocker(position, layer, 0, 1, box.radius + Vars.STRUCTURE_BLOCKER_PADDING, structure);
      } else {
         createRectangularGrassBlocker(position, layer, 0, 1, box.width + Vars.STRUCTURE_BLOCKER_PADDING * 2, box.height + Vars.STRUCTURE_BLOCKER_PADDING * 2, transformComponent.rotation + box.rotation, structure);
      }
   }
}

export function getGrassBlockerLengthBytes(blocker: GrassBlocker): number {
   let lengthBytes = 7 * Float32Array.BYTES_PER_ELEMENT;

   if (blockerIsCircluar(blocker)) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   } else {
      lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
   }

   return lengthBytes;
}

export function addGrassBlockerToData(packet: Packet, blocker: GrassBlocker): void {
   packet.addNumber(blocker.id);
   packet.addNumber(blocker.layer.depth);
   packet.addNumber(blocker.position.x);
   packet.addNumber(blocker.position.y);
   packet.addNumber(blocker.blockAmount);
   packet.addNumber(blocker.maxBlockAmount);

   packet.addBoolean(blockerIsCircluar(blocker));
   packet.padOffset(3);
   if (blockerIsCircluar(blocker)) {
      packet.addNumber(blocker.radius);
   } else {
      packet.addNumber(blocker.width);
      packet.addNumber(blocker.height);
      packet.addNumber(blocker.rotation);
   }
}

export function positionHasGrassBlocker(layer: Layer, x: number, y: number): boolean {
   // @HACK
   const range = 20;
   
   const minChunkX = unitsToChunksClamped(x - range);
   const maxChunkX = unitsToChunksClamped(x + range);
   const minChunkY = unitsToChunksClamped(y - range);
   const maxChunkY = unitsToChunksClamped(y + range);

   for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const blocker of chunk.grassBlockers) {
            if (blockerIsCircluar(blocker)) {
               const dist = distance(x, y, blocker.position.x, blocker.position.y);
               if (dist <= blocker.radius) {
                  return true;
               }
            } else {
               if (pointIsInRectangle(x, y, blocker.position.x, blocker.position.y, blocker.width, blocker.height, blocker.rotation)) {
                  return true;
               }
            }
         }
      }
   }
   return false;
}