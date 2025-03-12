import { Settings } from "battletribes-shared/settings";
import { getTileIndexIncludingEdges, TileIndex } from "battletribes-shared/utils";
import { createEmptySpawnDistribution, SPAWN_INFOS, SpawnDistribution } from "./entity-spawn-info";
import { getSpawnInfoSpawnableTiles } from "./entity-spawning";

const balancedDistributions = new Set<SpawnDistribution>();

const countNumSpawnableTiles = (chunkX: number, chunkY: number, spawnableTiles: ReadonlySet<TileIndex>): number => {
   const originTileX = chunkX * Settings.CHUNK_SIZE;
   const originTileY = chunkY * Settings.CHUNK_SIZE;
   
   // @Incomplete: doesn't account for layer
   let count = 0;
   for (let tileX = originTileX; tileX < originTileX + Settings.CHUNK_SIZE; tileX++) {
      for (let tileY = originTileY; tileY < originTileY + Settings.CHUNK_SIZE; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (spawnableTiles.has(tileIndex)) {
            count++;
         }
      }
   }

   return count;
}

export function createBalancedSpawnDistribution(): SpawnDistribution {
   const spawnDistribution = createEmptySpawnDistribution();
   balancedDistributions.add(spawnDistribution);
   return spawnDistribution;
}

export function updateResourceDistributions(): void {
   // Weight the distributions to the amount of tiles
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const spawnInfo = SPAWN_INFOS[i];
      const spawnDistribution = spawnInfo.spawnDistribution;
      if (typeof spawnDistribution === "undefined" || !balancedDistributions.has(spawnDistribution)) {
         continue;
      }
      
      const spawnableTiles = getSpawnInfoSpawnableTiles(i);
      
      spawnDistribution.totalWeight = 0;
      
      let idx = 0;
      for (let chunkY = 0; chunkY < Settings.BOARD_SIZE; chunkY++) {
         for (let chunkX = 0; chunkX < Settings.BOARD_SIZE; chunkX++) {
            const numSpawnableTiles = countNumSpawnableTiles(chunkX, chunkY, spawnableTiles);
            
            // @HACK !
            // const entityCount = samples[idx];
            // const entityCount = 0;
            // const weight = numSpawnableTiles / (entityCount + 0.15);
            const weight = numSpawnableTiles;
            
            spawnDistribution.weights[idx] = weight;
            spawnDistribution.totalWeight += weight;

            idx++;
         }
      }
   }
}