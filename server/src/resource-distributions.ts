import { Settings } from "battletribes-shared/settings";
import { getTileIndexIncludingEdges, getTileX, getTileY, Point, TileIndex } from "battletribes-shared/utils";
import { getSpawnInfoSpawnableTiles } from "./entity-spawning";
import { SPAWN_INFOS } from "./entity-spawn-info";

const enum Vars {
   /** Size of each sample in tiles */
   SAMPLE_SIZE = 4,
   SAMPLE_UNITS = Vars.SAMPLE_SIZE * Settings.TILE_SIZE,
   SAMPLES_IN_WORLD_SIZE = Settings.TILES_IN_WORLD_WIDTH / Vars.SAMPLE_SIZE
}

/** How dense the sample is. The higher the number, the lower the chance of a position being generated there. */
type SampleDensity = number;

const distributions = new Array<Array<SampleDensity>>();
const totalSampleDensities: Record<number, number> = {};

const sampleNumSpawnableTilesRecord: Partial<Record<number, ReadonlyArray<number>>> = {};

for (let i = 0; i < SPAWN_INFOS.length; i++) {
   const samples = new Array<number>();
   for (let i = 0; i < Vars.SAMPLES_IN_WORLD_SIZE * Vars.SAMPLES_IN_WORLD_SIZE; i++) {
      samples.push(-1);
   }
   distributions.push(samples);
}

const resetDistributions = (spawnInfoIdx: number): void => {
   const samples = distributions[spawnInfoIdx];
   for (let i = 0; i < Vars.SAMPLES_IN_WORLD_SIZE * Vars.SAMPLES_IN_WORLD_SIZE; i++) {
      samples[i] = 0;
   }
}

const countNumSpawnableTiles = (sampleX: number, sampleY: number, spawnableTiles: ReadonlySet<TileIndex>): number => {
   const originTileX = sampleX * Vars.SAMPLE_SIZE;
   const originTileY = sampleY * Vars.SAMPLE_SIZE;
   
   // @Incomplete: doesn't account for layer
   let count = 0;
   for (let tileX = originTileX; tileX < originTileX + Vars.SAMPLE_SIZE; tileX++) {
      for (let tileY = originTileY; tileY < originTileY + Vars.SAMPLE_SIZE; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (spawnableTiles.has(tileIndex)) {
            count++;
         }
      }
   }

   return count;
}

export function countTileTypesForResourceDistributions(): void {
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const spawnableTiles = getSpawnInfoSpawnableTiles(i);

      const numSpawnableTilesArray = new Array<number>();
      for (let sampleY = 0; sampleY < Vars.SAMPLES_IN_WORLD_SIZE; sampleY++) {
         for (let sampleX = 0; sampleX < Vars.SAMPLES_IN_WORLD_SIZE; sampleX++) {
            const numSpawnableTiles = countNumSpawnableTiles(sampleX, sampleY, spawnableTiles);
            numSpawnableTilesArray.push(numSpawnableTiles);
         }
      }

      sampleNumSpawnableTilesRecord[i] = numSpawnableTilesArray;
   }
}

// @Speed: this is reaaaally slow. 8% of CPU usage (should be way less), and causes CPU spikes.
export function updateResourceDistributions(): void {
   // Weight the distributions to the amount of tiles
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      resetDistributions(i);
      
      const samples = distributions[i];
      const numSpawnableTilesArray = sampleNumSpawnableTilesRecord[i]!;

      let totalDensity = 0;
      
      let idx = 0;
      for (let sampleY = 0; sampleY < Vars.SAMPLES_IN_WORLD_SIZE; sampleY++) {
         for (let sampleX = 0; sampleX < Vars.SAMPLES_IN_WORLD_SIZE; sampleX++) {
            const entityCount = samples[idx];
            const numSpawnableTiles = numSpawnableTilesArray[idx];

            if (numSpawnableTiles === 0) {
               samples[idx] = -1;
            } else {
               const inverseDensity = numSpawnableTiles / (entityCount + 0.15);
               
               samples[idx] = inverseDensity;
               totalDensity += inverseDensity;
            }

            idx++;
         }
      }

      totalSampleDensities[i] = totalDensity;
   }
}

const getDistributionWeightedSampleIndex = (spawnInfoIdx: number): number => {
   // @Incomplete: investigate inverse
   
   const totalDensity = totalSampleDensities[spawnInfoIdx];
   const samples = distributions[spawnInfoIdx];

   const targetDensity = totalDensity * Math.random();

   let currentDensity = 0;
   for (let i = 0; i < Vars.SAMPLES_IN_WORLD_SIZE * Vars.SAMPLES_IN_WORLD_SIZE; i++) {
      const density = samples[i];
      if (density === -1) {
         continue;
      }

      currentDensity += density;
      if (currentDensity >= targetDensity) {
         return i;
      }
   }

   throw new Error();
}

const getRandomSpawnableTileIndex = (sampleIdx: number, spawnableTiles: ReadonlySet<TileIndex>): number => {
   const sampleX = sampleIdx % Vars.SAMPLES_IN_WORLD_SIZE;
   const sampleY = Math.floor(sampleIdx / Vars.SAMPLES_IN_WORLD_SIZE);
   
   const originTileX = sampleX * Vars.SAMPLE_SIZE;
   const originTileY = sampleY * Vars.SAMPLE_SIZE;
   
   const spawnableTileIndexes = new Array<number>();
   for (let xOffset = 0; xOffset < Vars.SAMPLE_SIZE; xOffset++) {
      for (let yOffset = 0; yOffset < Vars.SAMPLE_SIZE; yOffset++) {
         const tileX = originTileX + xOffset;
         const tileY = originTileY + yOffset;

         // @Hack
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (spawnableTiles.has(tileIndex)) {
            spawnableTileIndexes.push(tileIndex);
         }
      }
   }

   return spawnableTileIndexes[Math.floor(spawnableTileIndexes.length * Math.random())];
}

export function getDistributionWeightedSpawnPosition(spawnInfoIdx: number): Point {
   const sampleIdx = getDistributionWeightedSampleIndex(spawnInfoIdx);

   const spawnableTiles = getSpawnInfoSpawnableTiles(spawnInfoIdx);
   const tileIndex = getRandomSpawnableTileIndex(sampleIdx, spawnableTiles);

   const tileX = getTileX(tileIndex);
   const tileY = getTileY(tileIndex);
   
   const x = (tileX + Math.random()) * Settings.TILE_SIZE;
   const y = (tileY + Math.random()) * Settings.TILE_SIZE;
   return new Point(x, y);
}