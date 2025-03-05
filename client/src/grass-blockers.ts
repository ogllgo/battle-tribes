import { Box } from "../../shared/src/boxes/boxes";
import { Entity, EntityType } from "../../shared/src/entities";
import { PacketReader } from "../../shared/src/packets";
import { assert, unitsToChunksClamped } from "../../shared/src/utils";
import Board from "./Board";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { EntityRenderInfo } from "./EntityRenderInfo";
import Layer from "./Layer";
import { padBoxData, readBoxFromData } from "./networking/packet-hitboxes";
import ColouredRenderPart from "./render-parts/ColouredRenderPart";
import { registerDirtyRenderInfo } from "./rendering/render-part-matrices";
import { calculateGrassBlockerVertexData } from "./rendering/webgl/grass-blocker-rendering";
import { gl } from "./webgl";
import { entityExists, getEntityRenderInfo, getEntityType, layers } from "./world";

export interface GrassBlocker {
   readonly box: Box;
   /** Amount of grass that the blocker blocks (from 0 -> 1) */
   blockAmount: number;
   // @Bandwidth: unnecessary
   readonly maxBlockAmount: number;
   lastUpdateTicks: number;
   readonly affectedGrassStrands: Array<Entity>;

   readonly vao: WebGLVertexArrayObject;
   // @Cleanup: should be readonly
   vertexDataLength: number;
}

const grassBlockers = new Map<number, GrassBlocker>();

const strandBlockers = new Map<Entity, Array<number>>();

export function getGrassBlockers(): ReadonlyMap<number, Readonly<GrassBlocker>> {
   return grassBlockers;
}

const addAffectedGrassStrands = (layer: Layer, blockerBox: Box, blocker: GrassBlocker): void => {
   const minChunkX = unitsToChunksClamped(blockerBox.calculateBoundsMinX());
   const maxChunkX = unitsToChunksClamped(blockerBox.calculateBoundsMaxX());
   const minChunkY = unitsToChunksClamped(blockerBox.calculateBoundsMinY());
   const maxChunkY = unitsToChunksClamped(blockerBox.calculateBoundsMaxY());
   for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         const chunk = layer.getChunk(chunkX, chunkY);

         for (const entity of chunk.entities) {
            if (getEntityType(entity) === EntityType.grassStrand) {
               const grassTransformComponent = TransformComponentArray.getComponent(entity);
               const grassHitbox = grassTransformComponent.hitboxes[0];
               if (blockerBox.isColliding(grassHitbox.box)) {
                  blocker.affectedGrassStrands.push(entity);
               }
            }
         }
      }
   }
}

const readGrassBlockerExceptIDFromData = (reader: PacketReader): GrassBlocker => {
   const layerIdx = reader.readNumber();
   const box = readBoxFromData(reader);
   const blockAmount = reader.readNumber();
   const maxBlockAmount = reader.readNumber();
   
   const vao = gl.createVertexArray();

   const blocker: GrassBlocker = {
      box: box,
      blockAmount: blockAmount,
      maxBlockAmount: maxBlockAmount,
      lastUpdateTicks: Board.serverTicks,
      affectedGrassStrands: [],
      vao: vao,
      vertexDataLength: 0
   };

   const layer = layers[layerIdx];

   addAffectedGrassStrands(layer, box, blocker);

   gl.bindVertexArray(vao);

   const vertexData = calculateGrassBlockerVertexData(blocker);
   blocker.vertexDataLength = vertexData.length;
   
   const vertexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   // @Speed
   gl.bindVertexArray(null);

   return blocker;
}

const updateGrassStrandOpacity = (renderInfo: EntityRenderInfo, opacity: number): void => {
   for (const renderPart of renderInfo.renderPartsByZIndex as Array<ColouredRenderPart>) {
      renderPart.opacity = opacity;
   }
}

export function updateGrassBlockers(reader: PacketReader): void {
   const numBlockers = reader.readNumber();
   for (let i = 0; i < numBlockers; i++) {
      const id = reader.readNumber();

      const existingGrassBlocker = grassBlockers.get(id);
      if (typeof existingGrassBlocker !== "undefined") {
         // Update grass blocker
         
         reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
         padBoxData(reader);
         existingGrassBlocker.blockAmount = reader.readNumber();
         reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

         existingGrassBlocker.lastUpdateTicks = Board.serverTicks;
      } else {
         const grassBlocker = readGrassBlockerExceptIDFromData(reader);
         grassBlockers.set(id, grassBlocker);

         for (const grassStrand of grassBlocker.affectedGrassStrands) {
            const renderInfo = getEntityRenderInfo(grassStrand);
            updateGrassStrandOpacity(renderInfo, 0);
            registerDirtyRenderInfo(renderInfo);

            const blockers = strandBlockers.get(grassStrand);
            if (typeof blockers === "undefined") {
               strandBlockers.set(grassStrand, [id]);
            } else {
               blockers.push(id);
            }
         }
      }
   }

   // Check for removed blockers
   for (const pair of grassBlockers) {
      const blocker = pair[1];
      if (blocker.lastUpdateTicks !== Board.serverTicks) {
         const id = pair[0];
         grassBlockers.delete(id);

         // @Copynpaste
         for (const grassStrand of blocker.affectedGrassStrands) {
            if (entityExists(grassStrand)) {
               const blockers = strandBlockers.get(grassStrand);
               assert(typeof blockers !== "undefined");
               const idx = blockers.indexOf(id);
               assert(idx !== -1)
               blockers.splice(idx, 1);

               if (blockers.length === 0) {
                  const renderInfo = getEntityRenderInfo(grassStrand);
                  updateGrassStrandOpacity(renderInfo, 1);
                  registerDirtyRenderInfo(renderInfo);
                  strandBlockers.delete(grassStrand);
               }
            }
         }
      }
   }
}