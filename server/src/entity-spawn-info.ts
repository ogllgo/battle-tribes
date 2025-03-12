import { Biome } from "../../shared/src/biomes";
import { RIVER_STEPPING_STONE_SIZES } from "../../shared/src/client-server-types";
import { EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { TileType } from "../../shared/src/tiles";
import { distance, getTileIndexIncludingEdges, getTileX, getTileY, Point, TileIndex } from "../../shared/src/utils";
import { getSpawnInfoSpawnableTiles } from "./entity-spawning";
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

export interface SpawnDistribution {
   /** For each chunk idx, stores that chunk's corresponding weight */
   readonly weights: Float32Array;
   totalWeight: number;
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
   /** If present, spawn attempts will be weighted towards areas with more weight. */
   readonly spawnDistribution?: SpawnDistribution;
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

export function registerNewSpawnInfo(spawnInfo: EntitySpawnInfo): void {
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

export function createEmptySpawnDistribution(): SpawnDistribution {
   return {
      weights: new Float32Array(Settings.BOARD_SIZE * Settings.BOARD_SIZE),
      totalWeight: 0
   };
}

const getDistributionWeightedSampleIndex = (spawnDistribution: SpawnDistribution): number => {
   const targetWeight = spawnDistribution.totalWeight * Math.random();

   let currentWeight = 0;
   for (let i = 0; i < Settings.BOARD_SIZE * Settings.BOARD_SIZE; i++) {
      const chunkSpawnWeight = spawnDistribution.weights[i];

      currentWeight += chunkSpawnWeight;
      if (currentWeight >= targetWeight) {
         return i;
      }
   }

   throw new Error();
}

const getRandomSpawnableTileIndex = (chunkIdx: number, spawnableTiles: ReadonlySet<TileIndex>): number => {
   const sampleX = chunkIdx % Settings.BOARD_SIZE;
   const sampleY = Math.floor(chunkIdx / Settings.BOARD_SIZE);
   
   const originTileX = sampleX * Settings.CHUNK_SIZE;
   const originTileY = sampleY * Settings.CHUNK_SIZE;
   
   const spawnableTileIndexes = new Array<number>();
   for (let xOffset = 0; xOffset < Settings.CHUNK_SIZE; xOffset++) {
      for (let yOffset = 0; yOffset < Settings.CHUNK_SIZE; yOffset++) {
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

export function getDistributionWeightedSpawnPosition(spawnInfoIdx: number, spawnDistribution: SpawnDistribution): Point {
   const sampleIdx = getDistributionWeightedSampleIndex(spawnDistribution);

   const spawnableTiles = getSpawnInfoSpawnableTiles(spawnInfoIdx);
   const tileIndex = getRandomSpawnableTileIndex(sampleIdx, spawnableTiles);

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