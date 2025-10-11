import { Settings } from "battletribes-shared/settings";
import { Point, Vector } from "battletribes-shared/utils";
import Particle from "./Particle";
import { highMonocolourBufferContainer, highTexturedBufferContainer, lowMonocolourBufferContainer, lowTexturedBufferContainer } from "./rendering/webgl/particle-rendering";
import ObjectBufferContainer from "./rendering/ObjectBufferContainer";
import { tempFloat32ArrayLength1 } from "./webgl";
import { RenderPart } from "./render-parts/render-parts";
import { getComponentArrays } from "./entity-components/ComponentArray";

export interface EntityHitboxInfo {
   readonly vertexPositions: readonly [Point, Point, Point, Point];
   readonly sideAxes: ReadonlyArray<Vector>;
}

interface TickCallback {
   time: number;
   readonly callback: () => void;
}

// @CLEANUP: "Board" is weird...
abstract class Board {
   public static serverTicks: number;

   public static renderPartRecord: Record<number, RenderPart> = {};

   // @Cleanup This is too messy. Perhaps combine all into one
   // public static readonly particles = new Array<Particle>();
   public static lowMonocolourParticles = new Array<Particle>();
   public static lowTexturedParticles = new Array<Particle>();
   public static highMonocolourParticles = new Array<Particle>();
   public static highTexturedParticles = new Array<Particle>();

   public static tickCallbacks = new Array<TickCallback>();

   public static addTickCallback(time: number, callback: () => void): void {
      this.tickCallbacks.push({
         time: time,
         callback: callback
      });
   }

   public static updateTickCallbacks(): void {
      for (let i = this.tickCallbacks.length - 1; i >= 0; i--) {
         const tickCallbackInfo = this.tickCallbacks[i];
         tickCallbackInfo.time -= 1 * Settings.DT_S;
         if (tickCallbackInfo.time <= 0) {
            tickCallbackInfo.callback();
            this.tickCallbacks.splice(i, 1);
         }
      }
   }

   public static tickIntervalHasPassed(intervalSeconds: number): boolean {
      const ticksPerInterval = intervalSeconds * Settings.TICK_RATE;
      
      const previousCheck = (Board.serverTicks - 1) / ticksPerInterval;
      const check = Board.serverTicks / ticksPerInterval;
      return Math.floor(previousCheck) !== Math.floor(check);
   }

   private static updateParticleArray(particles: Array<Particle>, bufferContainer: ObjectBufferContainer): void {
      const removedParticleIndexes = new Array<number>();
      for (let i = 0; i < particles.length; i++) {
         const particle = particles[i];

         particle.age += 1 * Settings.DT_S;
         if (particle.age >= particle.lifetime) {
            removedParticleIndexes.push(i);
         } else {
            // Update opacity
            if (typeof particle.getOpacity !== "undefined") {
               const opacity = particle.getOpacity();
               tempFloat32ArrayLength1[0] = opacity;
               bufferContainer.setData(particle.id, 10, tempFloat32ArrayLength1);
            }
            // Update scale
            if (typeof particle.getScale !== "undefined") {
               const scale = particle.getScale();
               tempFloat32ArrayLength1[0] = scale;
               bufferContainer.setData(particle.id, 11, tempFloat32ArrayLength1);
            }
         }
      }

      // Remove removed particles
      for (let i = removedParticleIndexes.length - 1; i >= 0; i--) {
         const idx = removedParticleIndexes[i];
         const particle = particles[idx];

         bufferContainer.removeObject(particle.id);
         particles.splice(idx, 1);
      }
   }

   public static updateParticles(): void {
      this.updateParticleArray(this.lowMonocolourParticles, lowMonocolourBufferContainer);
      this.updateParticleArray(this.lowTexturedParticles, lowTexturedBufferContainer);
      this.updateParticleArray(this.highMonocolourParticles, highMonocolourBufferContainer);
      this.updateParticleArray(this.highTexturedParticles, highTexturedBufferContainer);
   }

   /** Ticks all entities without updating them */
   public static tickEntities(): void {
      const componentArrays = getComponentArrays();
      
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (typeof componentArray.onTick !== "undefined") {
            for (let j = 0; j < componentArray.activeEntities.length; j++) {
               const entity = componentArray.activeEntities[j];
               componentArray.onTick(entity);
            }
         }
         
         componentArray.deactivateQueue();
      }
   }

   // @Incomplete
   /** Updates the client's copy of the tiles array to match any tile updates that have occurred */
   // public static loadTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
   //    for (const update of tileUpdates) {
   //       const tileX = update.tileIndex % Settings.BOARD_DIMENSIONS;
   //       const tileY = Math.floor(update.tileIndex / Settings.BOARD_DIMENSIONS);
         
   //       let tile = this.getTile(tileX, tileY);
   //       tile.type = update.type;
   //       tile.isWall = update.isWall;
   //    }
   // }
}

export default Board;

export function getSecondsSinceTickTimestamp(ticks: number): number {
   const ticksSince = Board.serverTicks - ticks;
   let secondsSince = ticksSince * Settings.DT_S;

   return secondsSince;
}

export function getElapsedTimeInSeconds(elapsedTicks: number): number {
   let secondsSince = elapsedTicks * Settings.DT_S;

   return secondsSince;
}

if (module.hot) {
   module.hot.dispose(data => {
      data.serverTicks = Board.serverTicks;
      data.renderPartRecord = Board.renderPartRecord;
      data.lowMonocolourParticles = Board.lowMonocolourParticles;
      data.lowTexturedParticles = Board.lowTexturedParticles;
      data.highMonocolourParticles = Board.highMonocolourParticles;
      data.highTexturedParticles = Board.highTexturedParticles;
      data.tickCallbacks = Board.tickCallbacks;
   });

   if (module.hot.data) {
      Board.serverTicks = module.hot.data.serverTicks;
      Board.renderPartRecord = module.hot.data.renderPartRecord;
      Board.lowMonocolourParticles = module.hot.data.lowMonocolourParticles;
      Board.lowTexturedParticles = module.hot.data.lowTexturedParticles;
      Board.highMonocolourParticles = module.hot.data.highMonocolourParticles;
      Board.highTexturedParticles = module.hot.data.highTexturedParticles;
      Board.tickCallbacks = module.hot.data.tickCallbacks;
   }
}