import { Box } from "../../shared/src/boxes/boxes";
import { Entity, EntityType } from "../../shared/src/entities";
import { PacketReader } from "../../shared/src/packets";
import { assert, unitsToChunksClamped } from "../../shared/src/utils";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { EntityRenderInfo } from "./EntityRenderInfo";
import { currentSnapshot } from "./client";
import Layer from "./Layer";
import { readBoxFromData } from "./networking/packet-hitboxes";
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
   readonly vertexBuffer: WebGLBuffer;
   // @Cleanup: should be readonly
   vertexDataLength: number;
}

export interface GrassBlockerData {
   readonly id: number;
   readonly box: Box;
   readonly layer: Layer;
   readonly blockAmount: number;
   readonly maxBlockAmount: number;
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
               const collisionResult = blockerBox.getCollisionResult(grassHitbox.box);
               if (collisionResult.isColliding) {
                  blocker.affectedGrassStrands.push(entity);
               }
            }
         }
      }
   }
}

const createGrassBlockerFromData = (data: GrassBlockerData): GrassBlocker => {
   const vao = gl.createVertexArray();
   const vertexBuffer = gl.createBuffer()!;

   const blocker: GrassBlocker = {
      box: data.box,
      blockAmount: data.blockAmount,
      maxBlockAmount: data.maxBlockAmount,
      lastUpdateTicks: currentSnapshot.tick,
      affectedGrassStrands: [],
      vao: vao,
      vertexBuffer: vertexBuffer,
      vertexDataLength: 0
   };

   addAffectedGrassStrands(data.layer, data.box, blocker);

   gl.bindVertexArray(vao);

   const vertexData = calculateGrassBlockerVertexData(blocker);
   blocker.vertexDataLength = vertexData.length;
   
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

const updateGrassBlockerVertices = (blocker: GrassBlocker): void => {
   gl.bindVertexArray(blocker.vao);

   const newVertexData = calculateGrassBlockerVertexData(blocker);
   
   gl.bindBuffer(gl.ARRAY_BUFFER, blocker.vertexBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, newVertexData);
   
   gl.bindVertexArray(null);
}

const updateGrassStrandOpacity = (renderInfo: EntityRenderInfo, opacity: number): void => {
   for (const renderPart of renderInfo.renderPartsByZIndex as Array<ColouredRenderPart>) {
      renderPart.opacity = opacity;
   }
}

export function readGrassBlockers(reader: PacketReader): ReadonlyArray<GrassBlockerData> {
   const grassBlockerData = new Array<GrassBlockerData>();
   const numBlockers = reader.readNumber();
   for (let i = 0; i < numBlockers; i++) {
      const id = reader.readNumber();
      
      const layerIdx = reader.readNumber();
      const layer = layers[layerIdx];
      
      const box = readBoxFromData(reader);
      const blockAmount = reader.readNumber();
      const maxBlockAmount = reader.readNumber();
      
      const data: GrassBlockerData = {
         id: id,
         box: box,
         layer: layer,
         blockAmount: blockAmount,
         maxBlockAmount: maxBlockAmount
      };
      grassBlockerData.push(data);
   }
   return grassBlockerData;
}

export function updateGrassBlockersFromData(grassBlockerData: ReadonlyArray<GrassBlockerData>): void {
   for (const data of grassBlockerData) {
      const existingGrassBlocker = grassBlockers.get(data.id);
      if (typeof existingGrassBlocker !== "undefined") {
         // Update grass blocker
         existingGrassBlocker.blockAmount = data.blockAmount;
         updateGrassBlockerVertices(existingGrassBlocker);
         existingGrassBlocker.lastUpdateTicks = currentSnapshot.tick;
      } else {
         const grassBlocker = createGrassBlockerFromData(data);
         grassBlockers.set(data.id, grassBlocker);

         for (const grassStrand of grassBlocker.affectedGrassStrands) {
            const renderInfo = getEntityRenderInfo(grassStrand);
            // @SQUEAM cuz i wanna test removing the grass server-side!!!!
            // updateGrassStrandOpacity(renderInfo, 0);
            registerDirtyRenderInfo(renderInfo);

            const blockers = strandBlockers.get(grassStrand);
            if (typeof blockers === "undefined") {
               strandBlockers.set(grassStrand, [data.id]);
            } else {
               blockers.push(data.id);
            }
         }
      }
   }

   // Check for removed blockers
   for (const pair of grassBlockers) {
      const blocker = pair[1];
      if (blocker.lastUpdateTicks !== currentSnapshot.tick) {
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
                  // @SQUEAM cuz i wanna test removing the grass server-side!!!!
                  // updateGrassStrandOpacity(renderInfo, 1);
                  registerDirtyRenderInfo(renderInfo);
                  strandBlockers.delete(grassStrand);
               }
            }
         }
      }
   }
}