import { assert, Point } from "battletribes-shared/utils";
import { VisibleChunkBounds } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import { RENDER_CHUNK_EDGE_GENERATION, RENDER_CHUNK_SIZE, WORLD_RENDER_CHUNK_SIZE } from "./rendering/render-chunks";
import Chunk from "./Chunk";
import Layer from "./Layer";
import { entityExists } from "./world";
import { Entity } from "../../shared/src/entities";
import { calculateHitboxRenderPosition } from "./rendering/render-part-matrices";
import { Hitbox } from "./hitboxes";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";

export type VisiblePositionBounds = [minX: number, maxX: number, minY: number, maxY: number];

// @Incomplete?
// const registerVisibleChunk = (chunk: Chunk): void => {
//    // createEntityRenderedChunkData(chunk.x, chunk.y);
// }

// // @Incomplete?
// const deregisterVisibleChunk = (chunk: Chunk): void => {
//    // removeEntityRenderedChunkData(chunk.x, chunk.y);
// }

const getChunksFromRange = (layer: Layer, minChunkX: number, maxChunkX: number, minChunkY: number, maxChunkY: number): ReadonlyArray<Chunk> => {
   const chunks = new Array<Chunk>();
   
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         chunks.push(chunk);
      }
   }

   return chunks;
}

/** Gets all the chunks in chunks B missing from chunks A */
const getMissingChunks = (chunksA: ReadonlyArray<Chunk>, chunksB: ReadonlyArray<Chunk>): ReadonlyArray<Chunk> => {
   const missing = new Array<Chunk>();
   for (const chunk of chunksB) {
      if (!chunksA.includes(chunk)) {
         missing.push(chunk);
      }
   }
   return missing;
}

abstract class Camera {
   public static isSpectating = false;
   
   /** Larger = zoomed in, smaller = zoomed out */
   // @Temporary
   public static zoom: number = 1.4;
   // public static zoom: number = 0.8;
   // public static zoom: number = 1;

   public static trackedEntity: Entity = 0;
   public static trackedHitbox: Hitbox | null = null;

   public static position = new Point(0, 0);

   // this garbage is used in spectator mode
   public static lastTickPosition = new Point(0, 0);
   public static velocity = new Point(0, 0);
   
   public static isFree = false;

   public static minVisibleX = 0;
   public static maxVisibleX = 0;
   public static minVisibleY = 0;
   public static maxVisibleY = 0;

   public static minVisibleChunkX = 0;
   public static maxVisibleChunkX = 0;
   public static minVisibleChunkY = 0;
   public static maxVisibleChunkY = 0;

   public static minVisibleRenderChunkX = -1;
   public static maxVisibleRenderChunkX = -1;
   public static minVisibleRenderChunkY = -1;
   public static maxVisibleRenderChunkY = -1;

   // @Hack!!!!
   public static verybadIsTracking = false;

   public static applyCameraKinematics(): void {
      // this.lastTickPosition.x += this.velocity.x * Settings.I_TPS;
      // this.lastTickPosition.y += this.velocity.y * Settings.I_TPS;
   }

   public static setInitialVisibleChunkBounds(layer: Layer): void {
      this.minVisibleChunkX = Math.max(Math.floor((this.position.x - halfWindowWidth / this.zoom) / Settings.CHUNK_UNITS), 0);
      this.maxVisibleChunkX = Math.min(Math.floor((this.position.x + halfWindowWidth / this.zoom) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
      this.minVisibleChunkY = Math.max(Math.floor((this.position.y - halfWindowHeight / this.zoom) / Settings.CHUNK_UNITS), 0);
      this.maxVisibleChunkY = Math.min(Math.floor((this.position.y + halfWindowHeight / this.zoom) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

      const newChunks = getChunksFromRange(layer, this.minVisibleChunkX, this.maxVisibleChunkX, this.minVisibleChunkY, this.maxVisibleChunkY);

      // for (const chunk of newChunks) {
      //    registerVisibleChunk(chunk);
      // }
   }

   public static updateVisibleChunkBounds(): void {
      // const previousChunks = getChunksFromRange(layer, this.minVisibleChunkX, this.maxVisibleChunkX, this.minVisibleChunkY, this.maxVisibleChunkY);
      
      this.minVisibleX = this.position.x - halfWindowWidth / this.zoom;
      this.maxVisibleX = this.position.x + halfWindowWidth / this.zoom;
      this.minVisibleY = this.position.y - halfWindowHeight / this.zoom;
      this.maxVisibleY = this.position.y + halfWindowHeight / this.zoom;
      
      this.minVisibleChunkX = Math.max(Math.floor(this.minVisibleX / Settings.CHUNK_UNITS), 0);
      this.maxVisibleChunkX = Math.min(Math.floor(this.maxVisibleX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
      this.minVisibleChunkY = Math.max(Math.floor(this.minVisibleY / Settings.CHUNK_UNITS), 0);
      this.maxVisibleChunkY = Math.min(Math.floor(this.maxVisibleY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

      // const newChunks = getChunksFromRange(layer, this.minVisibleChunkX, this.maxVisibleChunkX, this.minVisibleChunkY, this.maxVisibleChunkY);

      // const removedChunks = getMissingChunks(newChunks, previousChunks);
      // for (const chunk of removedChunks) {
      //    deregisterVisibleChunk(chunk);
      // }

      // const addedChunks = getMissingChunks(previousChunks, newChunks);
      // for (const chunk of addedChunks) {
      //    registerVisibleChunk(chunk);
      // }
   }

   public static getVisibleChunkBounds(): VisibleChunkBounds {
      return [this.minVisibleChunkX, this.maxVisibleChunkX, this.minVisibleChunkY, this.maxVisibleChunkY];
   }

   public static updateVisibleRenderChunkBounds(): void {
      const unitsInChunk = Settings.TILE_SIZE * RENDER_CHUNK_SIZE;
      
      this.minVisibleRenderChunkX = Math.max(Math.floor((this.position.x - halfWindowWidth / this.zoom) / unitsInChunk), -RENDER_CHUNK_EDGE_GENERATION);
      this.maxVisibleRenderChunkX = Math.min(Math.floor((this.position.x + halfWindowWidth / this.zoom) / unitsInChunk), WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION - 1);
      this.minVisibleRenderChunkY = Math.max(Math.floor((this.position.y - halfWindowHeight / this.zoom) / unitsInChunk), -RENDER_CHUNK_EDGE_GENERATION);
      this.maxVisibleRenderChunkY = Math.min(Math.floor((this.position.y + halfWindowHeight / this.zoom) / unitsInChunk), WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION - 1);
   }

   public static trackEntity(trackedEntity: Entity): void {
      // @Hack
      if (entityExists(trackedEntity)) {
         const transformComponent = TransformComponentArray.getComponent(trackedEntity);
         const hitbox = transformComponent.children[0] as Hitbox;
         this.trackedHitbox = hitbox;
      } else {
         this.trackedHitbox = null;
      }
      
      this.trackedEntity = trackedEntity;
      this.isFree = trackedEntity === 0;
   }

   public static setPosition(x: number, y: number): void {
      this.position.x = x;
      this.position.y = y;
      this.lastTickPosition.x = x;
      this.lastTickPosition.y = y;
   }

   public static updateSpectatorPosition(deltaTime: number): void {
      this.position.x += this.velocity.x * deltaTime;
      this.position.y += this.velocity.y * deltaTime;
   }

   public static updatePosition(frameProgress: number): void {
      if (this.isSpectating) {
         // this.position.x = this.lastTickPosition.x + this.velocity.x / Settings.TPS * frameProgress;
         // this.position.y = this.lastTickPosition.y + this.velocity.y / Settings.TPS * frameProgress;
         this.position.x = this.lastTickPosition.x;
         this.position.y = this.lastTickPosition.y;
         return;
      }

      if (this.isFree) {
         return;
      }
      
      if (entityExists(this.trackedEntity)) {
         assert(this.trackedHitbox !== null);

         const pos = calculateHitboxRenderPosition(this.trackedHitbox, frameProgress);
         this.position.x = pos.x;
         this.position.y = pos.y;
      } else {
         this.trackedEntity = 0;
         this.trackedHitbox = null;
      }
   }

   /** X position in the screen (0 = left, windowWidth = right) */
   public static calculateXScreenPos(x: number): number {
      // Account for the player position
      const playerRelativePosition = x - this.position.x;
      
      // Account for zoom
      return playerRelativePosition * this.zoom + halfWindowWidth;
   }

   /** Y position in the screen (0 = bottom, windowHeight = top) */
   public static calculateYScreenPos(y: number): number {
      // Account for the player position
      const playerRelativePosition = y - this.position.y;
      
      // Account for zoom
      return playerRelativePosition * this.zoom + halfWindowHeight;
   }
}

export default Camera;