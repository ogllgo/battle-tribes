import { RIVER_STEPPING_STONE_SIZES, RiverSteppingStoneData } from "battletribes-shared/client-server-types";
import { GrassBlocker } from "battletribes-shared/grass-blockers";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { distance } from "battletribes-shared/utils";
import { getEntityType, surfaceLayer } from "./world";
import { getEntitiesInRange } from "./ai-shared";
import Layer from "./Layer";

// @Cleanup @Memory: A lot of these properties aren't used by collision chunks
class Chunk {
   /** Stores all entities inside the chunk */
   public readonly entities = new Array<Entity>();

   /** Stores all mobs which have the chunk in their vision range */
   public readonly viewingEntities = new Array<Entity>();

   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   public readonly grassBlockers = new Array<GrassBlocker>();
   
   public hasWallTiles = false;
}

export default Chunk;

// @Cleanup: Should this be here?
export function isTooCloseToSteppingStone(x: number, y: number, checkRadius: number): boolean {
   const minChunkX = Math.max(Math.min(Math.floor((x - checkRadius) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((x + checkRadius) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((y - checkRadius) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((y + checkRadius) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = surfaceLayer.getChunk(chunkX, chunkY);

         for (const steppingStone of chunk.riverSteppingStones) {
            const dist = distance(x, y, steppingStone.positionX, steppingStone.positionY) - RIVER_STEPPING_STONE_SIZES[steppingStone.size] * 0.5;
            
            if (dist < checkRadius) {
               return true;
            }
         }
      }
   }

   return false;
}

// @Cleanup: Should this be here?
export function isTooCloseToReedOrLilypad(layer: Layer, x: number, y: number): boolean {
   // Don't overlap with reeds at all
   let entities = getEntitiesInRange(layer, x, y, 24);
   for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (getEntityType(entity) === EntityType.reed) {
         return true;
      }
   }

   // Only allow overlapping slightly with other lilypads
   entities = getEntitiesInRange(layer, x, y, 24 - 6);
   for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (getEntityType(entity) === EntityType.lilypad) {
         return true;
      }
   }

   return false;
}