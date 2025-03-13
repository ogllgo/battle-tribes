import { Biome } from "../../shared/src/biomes";
import { RIVER_STEPPING_STONE_SIZES } from "../../shared/src/client-server-types";
import { EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { TileType } from "../../shared/src/tiles";
import { assert, distance, getTileIndexIncludingEdges, getTileX, getTileY, Point, TileIndex } from "../../shared/src/utils";
import Layer from "./Layer";
import { surfaceLayer } from "./layers";

export interface PackSpawningInfo {
   readonly minPackSize: number;
   readonly maxPackSize: number;
   /** Distance from the original spawn that pack spawns can be made in */
   readonly spawnRange: number;
}

export interface SpawnDistributionChunkInfo {
   /** How dense the sample is. The higher the number, the lower the chance of a position being generated there. */
   density: number;
   readonly numSpawnableTiles: number;
}

/** Spawn attempts will be weighted towards areas with more weight. */
export interface SpawnDistribution {
   /** For each chunk idx, stores that chunk's corresponding weight */
   readonly weights: Float32Array;
   totalWeight: number;
   readonly blockSize: number;
}

export interface EntitySpawnInfoParams {
   /** The type of entity to spawn */
   readonly entityType: EntityType;
   readonly layer: Layer;
   /** Average number of spawn attempts that happen each second per chunk. */
   readonly spawnRate: number;
   /** Maximum global density per tile the entity type can have. */
   readonly maxDensity: number;
   readonly spawnableTileTypes: ReadonlyArray<TileType>;
   readonly onlySpawnsInNight: boolean;
   /** Minimum distance a spawn event can occur from another entity */
   readonly minSpawnDistance: number;
   readonly packSpawning?: PackSpawningInfo;
   readonly blockSize: number;
   readonly balanceSpawnDistribution: boolean;
   readonly customSpawnIsValidFunc?: (spawnInfo: EntitySpawnInfo, spawnOriginX: number, spawnOriginY: number) => boolean;
}

export interface EntitySpawnInfo {
   /** The type of entity to spawn */
   readonly entityType: EntityType;
   readonly layer: Layer;
   /** Average number of spawn attempts that happen each second per chunk. */
   readonly spawnRate: number;
   /** Maximum global density per tile the entity type can have. */
   readonly maxDensity: number;
   readonly spawnableTileTypes: ReadonlyArray<TileType>;
   readonly onlySpawnsInNight: boolean;
   /** Minimum distance a spawn event can occur from another entity */
   readonly minSpawnDistance: number;
   readonly packSpawning?: PackSpawningInfo;
   readonly spawnDistribution: SpawnDistribution;
   readonly balanceSpawnDistribution: boolean;
   readonly customSpawnIsValidFunc?: (spawnInfo: EntitySpawnInfo, spawnOriginX: number, spawnOriginY: number) => boolean;
}

// @Incomplete!
   // {
   //    entityType: EntityType.fibrePlant,
   //    spawnRate: 0.001,
   //    maxDensity: 0.0015,
   //    minPackSize: 1,
   //    maxPackSize: 1,
   //    onlySpawnsInNight: false,
   //    minSpawnDistance: 45,
   //    usesSpawnDistribution: true
   // },
   
export const SPAWN_INFOS = new Array<EntitySpawnInfo>();

const countNumSpawnableTiles = (params: EntitySpawnInfoParams, blockX: number, blockY: number): number => {
   const originTileX = blockX * params.blockSize;
   const originTileY = blockY * params.blockSize;
   
   // @Incomplete: doesn't account for layer
   let count = 0;
   for (let tileX = originTileX; tileX < originTileX + params.blockSize; tileX++) {
      for (let tileY = originTileY; tileY < originTileY + params.blockSize; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tileType = params.layer.getTileType(tileIndex);
         if (params.spawnableTileTypes.includes(tileType)) {
            count++;
         }
      }
   }

   return count;
}

export function createEmptySpawnDistribution(blockSize: number): SpawnDistribution {
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.BOARD_DIMENSIONS / blockSize;
   assert(Math.floor(BLOCKS_IN_BOARD_DIMENSIONS) === BLOCKS_IN_BOARD_DIMENSIONS);

   return {
      weights: new Float32Array(BLOCKS_IN_BOARD_DIMENSIONS * BLOCKS_IN_BOARD_DIMENSIONS),
      totalWeight: 0,
      blockSize: blockSize
   }
}

const createBaseSpawnDistribution = (params: EntitySpawnInfoParams): SpawnDistribution => {
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.BOARD_DIMENSIONS / params.blockSize;
   assert(Math.floor(BLOCKS_IN_BOARD_DIMENSIONS) === BLOCKS_IN_BOARD_DIMENSIONS);
   
   const weights = new Float32Array(BLOCKS_IN_BOARD_DIMENSIONS * BLOCKS_IN_BOARD_DIMENSIONS);
   let totalWeight = 0;
   let i = 0;
   for (let blockY = 0; blockY < BLOCKS_IN_BOARD_DIMENSIONS; blockY++) {
      for (let blockX = 0; blockX < BLOCKS_IN_BOARD_DIMENSIONS; blockX++) {
         const numSpawnableTiles = countNumSpawnableTiles(params, blockX, blockY);

         const weight = numSpawnableTiles / (params.blockSize * params.blockSize);
         weights[i] = weight;
         totalWeight += weight;
         i++;
      }
   }

   return {
      weights: weights,
      totalWeight: totalWeight,
      blockSize: params.blockSize
   };
}

const combineSpawnDistributions = (baseDistribution: SpawnDistribution, customDistribution: SpawnDistribution): void => {
   assert(baseDistribution.weights.length === customDistribution.weights.length);
   
   baseDistribution.totalWeight = 0;
   for (let i = 0; i < baseDistribution.weights.length; i++) {
      const weight = baseDistribution.weights[i] * customDistribution.weights[i];
      baseDistribution.weights[i] = weight;
      baseDistribution.totalWeight += weight;
   }
}

const createEntitySpawnInfo = (params: EntitySpawnInfoParams, customSpawnDistribution?: SpawnDistribution): EntitySpawnInfo => {
   const baseSpawnDistribution = createBaseSpawnDistribution(params);

   if (typeof customSpawnDistribution !== "undefined") {
      combineSpawnDistributions(baseSpawnDistribution, customSpawnDistribution);
   }

   return {
      entityType: params.entityType,
      layer: params.layer,
      spawnRate: params.spawnRate,
      maxDensity: params.maxDensity,
      spawnableTileTypes: params.spawnableTileTypes,
      onlySpawnsInNight: params.onlySpawnsInNight,
      minSpawnDistance: params.minSpawnDistance,
      packSpawning: params.packSpawning,
      spawnDistribution: baseSpawnDistribution,
      balanceSpawnDistribution: params.balanceSpawnDistribution,
      customSpawnIsValidFunc: params.customSpawnIsValidFunc
   };
}

export function registerNewSpawnInfo(params: EntitySpawnInfoParams, customSpawnDistribution?: SpawnDistribution): void {
   const spawnInfo = createEntitySpawnInfo(params, customSpawnDistribution);
   SPAWN_INFOS.push(spawnInfo);
}

export function getSpawnInfoForEntityType(entityType: EntityType): EntitySpawnInfo | null {
   for (const spawnInfo of SPAWN_INFOS) {
      if (spawnInfo.entityType === entityType) {
         return spawnInfo;
      }
   }

   return null;
}

export function getSpawnInfoBiome(spawnInfo: EntitySpawnInfo): Biome {
   // @HACK @HACK @HACK
   const tileType = spawnInfo.spawnableTileTypes[0];
   switch (tileType) {
      case TileType.grass: return Biome.grasslands;
      case TileType.dirt: return Biome.grasslands;
      case TileType.water: return Biome.grasslands;
      case TileType.sludge: return Biome.swamp;
      case TileType.slime: return Biome.swamp;
      case TileType.rock: return Biome.mountains;
      case TileType.sand: return Biome.desert;
      case TileType.snow: return Biome.tundra;
      case TileType.ice: return Biome.tundra;
      case TileType.permafrost: return Biome.tundra;
      case TileType.magma: return Biome.grasslands;
      case TileType.lava: return Biome.grasslands;
      case TileType.fimbultur: return Biome.tundra;
      case TileType.dropdown: return Biome.grasslands;
      case TileType.stone: return Biome.caves;
      case TileType.stoneWallFloor: return Biome.caves;
   }
}

const getDistributionWeightedSampleIndex = (spawnDistribution: SpawnDistribution): number => {
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.BOARD_DIMENSIONS / spawnDistribution.blockSize;

   const targetWeight = spawnDistribution.totalWeight * Math.random();

   let currentWeight = 0;
   for (let i = 0; i < BLOCKS_IN_BOARD_DIMENSIONS * BLOCKS_IN_BOARD_DIMENSIONS; i++) {
      const chunkSpawnWeight = spawnDistribution.weights[i];

      currentWeight += chunkSpawnWeight;
      if (currentWeight >= targetWeight) {
         return i;
      }
   }

   throw new Error();
}

const getRandomSpawnableTileIndex = (blockSize: number, blockIdx: number, spawnInfo: EntitySpawnInfo): number => {
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.BOARD_DIMENSIONS / blockSize;
   
   const blockX = blockIdx % BLOCKS_IN_BOARD_DIMENSIONS;
   const blockY = Math.floor(blockIdx / BLOCKS_IN_BOARD_DIMENSIONS);
   
   const originTileX = blockX * blockSize;
   const originTileY = blockY * blockSize;
   
   const spawnableTileIndexes = new Array<number>();
   for (let xOffset = 0; xOffset < blockSize; xOffset++) {
      for (let yOffset = 0; yOffset < blockSize; yOffset++) {
         const tileX = originTileX + xOffset;
         const tileY = originTileY + yOffset;

         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tileType = spawnInfo.layer.getTileType(tileIndex);
         if (spawnInfo.spawnableTileTypes.includes(tileType)) {
            spawnableTileIndexes.push(tileIndex);
         }
      }
   }

   assert(spawnableTileIndexes.length > 0);
   return spawnableTileIndexes[Math.floor(spawnableTileIndexes.length * Math.random())];
}

export function getDistributionWeightedSpawnPosition(spawnInfoIdx: number, spawnDistribution: SpawnDistribution): Point {
   const blockIdx = getDistributionWeightedSampleIndex(spawnDistribution);

   const spawnInfo = SPAWN_INFOS[spawnInfoIdx];
   const tileIndex = getRandomSpawnableTileIndex(spawnDistribution.blockSize, blockIdx, spawnInfo);

   const tileX = getTileX(tileIndex);
   const tileY = getTileY(tileIndex);
   
   const x = (tileX + Math.random()) * Settings.TILE_SIZE;
   const y = (tileY + Math.random()) * Settings.TILE_SIZE;
   return new Point(x, y);
}

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