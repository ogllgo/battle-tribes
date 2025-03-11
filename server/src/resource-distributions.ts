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

interface ChunkInfo {
   /** How dense the sample is. The higher the number, the lower the chance of a position being generated there. */
   density: number;
   readonly numSpawnableTiles: number;
}

interface DistributionInfo {
   readonly chunks: ReadonlyArray<ChunkInfo>;
   totalDensity: number;
}

const spawnInfoDistributions = new Array<DistributionInfo>();

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

export function createResourceDistributions(): void {
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const spawnableTiles = getSpawnInfoSpawnableTiles(i);

      const chunks = new Array<ChunkInfo>();
      for (let sampleIdx = 0; sampleIdx < Vars.SAMPLES_IN_WORLD_SIZE * Vars.SAMPLES_IN_WORLD_SIZE; sampleIdx++) {
         const sampleX = sampleIdx % Vars.SAMPLES_IN_WORLD_SIZE;
         const sampleY = Math.floor(sampleIdx / Vars.SAMPLES_IN_WORLD_SIZE);

         chunks.push({
            density: -1,
            numSpawnableTiles: countNumSpawnableTiles(sampleX, sampleY, spawnableTiles)
         });
      }
   
      const distributionInfo: DistributionInfo = {
         chunks: chunks,
         totalDensity: 0
      };
      spawnInfoDistributions.push(distributionInfo);
   }
}

export function updateResourceDistributions(): void {
   // Weight the distributions to the amount of tiles
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const distributionInfo = spawnInfoDistributions[i];
      
      distributionInfo.totalDensity = 0;
      
      let idx = 0;
      for (let sampleY = 0; sampleY < Vars.SAMPLES_IN_WORLD_SIZE; sampleY++) {
         for (let sampleX = 0; sampleX < Vars.SAMPLES_IN_WORLD_SIZE; sampleX++) {
            const chunkInfo = distributionInfo.chunks[idx];

            if (chunkInfo.numSpawnableTiles === 0) {
               chunkInfo.density = -1;
            } else {
               // @HACK !
               // const entityCount = samples[idx];
               const entityCount = 0;

               const inverseDensity = chunkInfo.numSpawnableTiles / (entityCount + 0.15);
               
               chunkInfo.density = inverseDensity;
               distributionInfo.totalDensity += inverseDensity;
            }

            idx++;
         }
      }
   }
}

const getDistributionWeightedSampleIndex = (spawnInfoIdx: number): number => {
   // @Incomplete: investigate inverse
   
   const distributionInfo = spawnInfoDistributions[spawnInfoIdx];

   const targetDensity = distributionInfo.totalDensity * Math.random();

   let currentDensity = 0;
   for (let i = 0; i < Vars.SAMPLES_IN_WORLD_SIZE * Vars.SAMPLES_IN_WORLD_SIZE; i++) {
      const chunkInfo = distributionInfo.chunks[i];
      const density = chunkInfo.density;
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