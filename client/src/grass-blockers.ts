import { Box, updateBox } from "../../shared/src/boxes/boxes";
import CircularBox from "../../shared/src/boxes/CircularBox";
import RectangularBox from "../../shared/src/boxes/RectangularBox";
import { Entity, EntityType } from "../../shared/src/entities";
import { PacketReader } from "../../shared/src/packets";
import { assert, Point, unitsToChunksClamped } from "../../shared/src/utils";
import Board from "./Board";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { EntityRenderInfo } from "./EntityRenderInfo";
import Layer from "./Layer";
import ColouredRenderPart from "./render-parts/ColouredRenderPart";
import { registerDirtyRenderInfo } from "./rendering/render-part-matrices";
import { entityExists, getEntityRenderInfo, getEntityType, layers } from "./world";

interface BaseGrassBlocker {
   readonly position: Readonly<Point>;
   /** Amount of grass that the blocker blocks (from 0 -> 1) */
   blockAmount: number;
   // @Bandwidth: unnecessary
   readonly maxBlockAmount: number;
   lastUpdateTicks: number;
   readonly affectedGrassStrands: Array<Entity>;
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

const grassBlockers = new Map<number, GrassBlocker>();

const strandBlockers = new Map<Entity, Array<number>>();

export function blockerIsCircluar(blocker: GrassBlocker): blocker is GrassBlockerCircle {
   return typeof (blocker as GrassBlockerCircle).radius !== "undefined";
}

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
   const x = reader.readNumber();
   const y = reader.readNumber();
   const blockAmount = reader.readNumber();
   const maxBlockAmount = reader.readNumber();

   const isCircular = reader.readBoolean();
   reader.padOffset(3);

   const layer = layers[layerIdx];

   let blocker: GrassBlocker;
   let blockerBox: Box;
   if (isCircular) {
      const radius = reader.readNumber();
      
      // @Speed
      blockerBox = new CircularBox(null, new Point(0, 0), 0, radius);
      updateBox(blockerBox, x, y, 0);

      blocker =  {
         position: new Point(x, y),
         blockAmount: blockAmount,
         maxBlockAmount: maxBlockAmount,
         radius: radius,
         lastUpdateTicks: Board.serverTicks,
         affectedGrassStrands: []
      };
   } else {
      const width = reader.readNumber();
      const height = reader.readNumber();
      const rotation = reader.readNumber();

      // @Speed
      blockerBox = new RectangularBox(null, new Point(0, 0), width, height, rotation);
      updateBox(blockerBox, x, y, 0);
   
      blocker = {
         position: new Point(x, y),
         blockAmount: blockAmount,
         maxBlockAmount: maxBlockAmount,
         width: width,
         height: height,
         rotation: rotation,
         lastUpdateTicks: Board.serverTicks,
         affectedGrassStrands: []
      };
   }

   addAffectedGrassStrands(layer, blockerBox, blocker);

   return blocker;
}

const updateGrassStrandOpacity = (renderInfo: EntityRenderInfo, opacity: number): void => {
   for (const renderPart of renderInfo.allRenderThings as Array<ColouredRenderPart>) {
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
         reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
         existingGrassBlocker.blockAmount = reader.readNumber();
         reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
         
         const isCircular = reader.readBoolean();
         reader.padOffset(3);
         if (isCircular) {
            reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
         } else {
            reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
         }

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