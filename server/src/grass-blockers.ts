import { Settings } from "battletribes-shared/settings";
import Chunk from "./Chunk";
import { Entity } from "battletribes-shared/entities";
import { TransformComponentArray } from "./components/TransformComponent";
import { Box, boxIsCircular, cloneBox, HitboxFlag, updateVertexPositionsAndSideAxes } from "battletribes-shared/boxes/boxes";
import { entityExists, getEntityLayer } from "./world";
import { surfaceLayer } from "./layers";
import { Packet } from "../../shared/src/packets";
import { Point, unitsToChunksClamped } from "../../shared/src/utils";
import Layer from "./Layer";
import { boxIsInRange } from "./ai-shared";
import { addBoxDataToPacket, getBoxDataLength } from "./server/packet-hitboxes";

const enum Vars {
   GRASS_FULL_REGROW_TICKS = Settings.TPS * 120,
   GRASS_FULL_DIE_TICKS = Settings.TPS * 20,
   STRUCTURE_BLOCKER_PADDING = -4
}

export interface GrassBlocker {
   readonly id: number;
   readonly layer: Layer;
   readonly box: Readonly<Box>;
   /** Amount of grass that the blocker blocks (from 0 -> 1) */
   blockAmount: number;
   // @Bandwidth: unnecessary
   readonly maxBlockAmount: number;
}

let nextID = 0;

const blockers = new Array<GrassBlocker>();
const blockerAssociatedEntities = new Array<Entity>();

const getBlockerChunks = (blocker: GrassBlocker): ReadonlyArray<Chunk> => {
   const minX = blocker.box.calculateBoundsMinX();
   const maxX = blocker.box.calculateBoundsMaxX();
   const minY = blocker.box.calculateBoundsMinY();
   const maxY = blocker.box.calculateBoundsMaxY();
   
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

export function createGrassBlocker(box: Box, layer: Layer, initialBlockAmount: number, maxBlockAmount: number, associatedEntity: Entity): void {
   const blocker: GrassBlocker = {
      id: nextID++,
      layer: layer,
      box: box,
      blockAmount: initialBlockAmount,
      maxBlockAmount: maxBlockAmount
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
      
      const box = cloneBox(hitbox.box);
      if (boxIsCircular(box)) {
         box.radius += Vars.STRUCTURE_BLOCKER_PADDING;
      } else {
         box.width += 2 * Vars.STRUCTURE_BLOCKER_PADDING;
         box.height += 2 * Vars.STRUCTURE_BLOCKER_PADDING;
         updateVertexPositionsAndSideAxes(box);
      }

      createGrassBlocker(box, layer, 0, 1, structure);
   }
}

export function getGrassBlockerLengthBytes(blocker: GrassBlocker): number {
   let lengthBytes = 2 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += getBoxDataLength(blocker.box);
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   return lengthBytes;
}

export function addGrassBlockerToData(packet: Packet, blocker: GrassBlocker): void {
   packet.addNumber(blocker.id);
   packet.addNumber(blocker.layer.depth);

   addBoxDataToPacket(packet, blocker.box);
   
   packet.addNumber(blocker.blockAmount);
   packet.addNumber(blocker.maxBlockAmount);
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
            if (boxIsInRange(new Point(x, y), range, blocker.box)) {
               return true;
            }
         }
      }
   }
   return false;
}