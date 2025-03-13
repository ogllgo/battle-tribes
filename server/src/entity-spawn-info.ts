import { Biome } from "../../shared/src/biomes";
import { RIVER_STEPPING_STONE_SIZES } from "../../shared/src/client-server-types";
import { Entity, EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { TileType } from "../../shared/src/tiles";
import { assert, distance, getTileIndexIncludingEdges } from "../../shared/src/utils";
import { EntityConfig } from "./components";
import { getTransformComponentFirstHitbox, TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import Layer from "./Layer";
import { surfaceLayer } from "./layers";

export interface PackSpawningInfo {
   readonly minPackSize: number;
   readonly maxPackSize: number;
   /** Distance from the original spawn that pack spawns can be made in */
   readonly spawnRange: number;
}

interface EntityBlockDensityInfo {
   readonly blockIdx: number;
   readonly density: number;
}

export interface SpawnDistribution {
   readonly currentDensities: Float32Array;
   readonly targetDensities: Float32Array;
   readonly blockSize: number;
   readonly entityDensityMap: Map<Entity, Array<EntityBlockDensityInfo>>;
}

export interface EntitySpawnInfoParams {
   /** The type of entity to spawn */
   readonly entityType: EntityType;
   readonly layer: Layer;
   /** Average number of spawn attempts that happen each second per chunk. */
   readonly spawnRate: number;
   readonly spawnableTileTypes: ReadonlyArray<TileType>;
   readonly onlySpawnsInNight: boolean;
   /** Minimum distance a spawn event can occur from another entity */
   readonly minSpawnDistance: number;
   readonly packSpawning?: PackSpawningInfo;
   readonly rawSpawnDistribution: SpawnDistribution;
   readonly balanceSpawnDistribution: boolean;
   readonly createEntity: (x: number, y: number, angle: number, firstEntityConfig: EntityConfig | null, layer: Layer) => EntityConfig | null;
   readonly customSpawnIsValidFunc?: (spawnInfo: EntitySpawnInfo, spawnOriginX: number, spawnOriginY: number) => boolean;
}

export interface EntitySpawnInfo {
   /** The type of entity to spawn */
   readonly entityType: EntityType;
   readonly layer: Layer;
   /** Average number of spawn attempts that happen each second per chunk. */
   readonly spawnRate: number;
   readonly spawnableTileTypes: ReadonlyArray<TileType>;
   readonly onlySpawnsInNight: boolean;
   /** Minimum distance a spawn event can occur from another entity */
   readonly minSpawnDistance: number;
   readonly packSpawning?: PackSpawningInfo;
   readonly spawnDistribution: SpawnDistribution;
   readonly balanceSpawnDistribution: boolean;
   readonly createEntity: (x: number, y: number, angle: number, firstEntityConfig: EntityConfig | null, layer: Layer) => EntityConfig | null;
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
   const blockSize = params.rawSpawnDistribution.blockSize;

   const originTileX = blockX * blockSize;
   const originTileY = blockY * blockSize;
   
   // @Incomplete: doesn't account for layer
   let count = 0;
   for (let tileX = originTileX; tileX < originTileX + blockSize; tileX++) {
      for (let tileY = originTileY; tileY < originTileY + blockSize; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tileType = params.layer.getTileType(tileIndex);
         if (params.spawnableTileTypes.includes(tileType)) {
            count++;
         }
      }
   }

   return count;
}

/** Max density is the target number of entities per tile */
export function createRawSpawnDistribution(blockSize: number, maxDensity: number): SpawnDistribution {
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.BOARD_DIMENSIONS / blockSize;
   assert(Math.floor(BLOCKS_IN_BOARD_DIMENSIONS) === BLOCKS_IN_BOARD_DIMENSIONS);

   const densityPerBlock = maxDensity / (blockSize * blockSize);

   const currentDensities = new Float32Array(BLOCKS_IN_BOARD_DIMENSIONS * BLOCKS_IN_BOARD_DIMENSIONS);
   const targetDensities = new Float32Array(BLOCKS_IN_BOARD_DIMENSIONS * BLOCKS_IN_BOARD_DIMENSIONS);

   for (let i = 0; i < targetDensities.length; i++) {
      targetDensities[i] = densityPerBlock;
   }
   
   return {
      currentDensities: currentDensities,
      targetDensities: targetDensities,
      blockSize: blockSize,
      entityDensityMap: new Map()
   };
}

/** Takes into account the spawnable tiles into the raw spawn distribution */
const createBaseSpawnDistribution = (params: EntitySpawnInfoParams): void => {
   const blockSize = params.rawSpawnDistribution.blockSize;
   
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.BOARD_DIMENSIONS / blockSize;
   assert(Math.floor(BLOCKS_IN_BOARD_DIMENSIONS) === BLOCKS_IN_BOARD_DIMENSIONS);
   
   const targetDensities = new Float32Array(BLOCKS_IN_BOARD_DIMENSIONS * BLOCKS_IN_BOARD_DIMENSIONS);
   let i = 0;
   for (let blockY = 0; blockY < BLOCKS_IN_BOARD_DIMENSIONS; blockY++) {
      for (let blockX = 0; blockX < BLOCKS_IN_BOARD_DIMENSIONS; blockX++) {
         const numSpawnableTiles = countNumSpawnableTiles(params, blockX, blockY);

         const targetDensity = numSpawnableTiles / (blockSize * blockSize);
         targetDensities[i] = targetDensity;
         i++;
      }
   }

   for (let i = 0; i < params.rawSpawnDistribution.targetDensities.length; i++) {
      params.rawSpawnDistribution.targetDensities[i] *= targetDensities[i];
   }
}

export function addEntityToSpawnDistribution(spawnDistribution: SpawnDistribution, entity: Entity, x: number, y: number): void {
   // Distribute a density of 1 amongst the blocks in a diamond-shaped expansion
   // @Correctness: Instead of adding from just the position of the entity, it should add from all blocks in the bounding area
   
   const blockSize = spawnDistribution.blockSize;
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.BOARD_DIMENSIONS / blockSize;
   
   const blockX = Math.floor(x / Settings.TILE_SIZE / blockSize);
   const blockY = Math.floor(y / Settings.TILE_SIZE / blockSize);
   
   let remainingDensity = 1;
   const densityInfos = new Array<EntityBlockDensityInfo>();
   
   const blockIdx = blockY * BLOCKS_IN_BOARD_DIMENSIONS + blockX;
   const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];

   const usedDensity = Math.min(remainingDensity, blockTargetDensity);

   // This can sometimes not be the case due to pack spawning causing an entity to spawn in a block with 0 target density
   if (usedDensity > 0) {
      remainingDensity -= usedDensity;
      densityInfos.push({
         blockIdx: blockIdx,
         density: usedDensity
      });
   }

   for (let dist = 1; remainingDensity > 0; dist++) {
      // Count the total density in the pass
      let totalPassDensity = 0;
      for (let i = 0; i <= dist; i++) {
         // Top right
         if (blockX + i >= 0 && blockX + i < BLOCKS_IN_BOARD_DIMENSIONS && blockY - dist + i >= 0 && blockY - dist + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY - dist + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX + i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            totalPassDensity += blockTargetDensity;
         }
         // Bottom right
         if (blockX + dist - i >= 0 && blockX + dist - i < BLOCKS_IN_BOARD_DIMENSIONS && blockY + i >= 0 && blockY + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX + dist - i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            totalPassDensity += blockTargetDensity;
         }
         // Bottom left
         if (blockX - dist + i >= 0 && blockX - dist + i < BLOCKS_IN_BOARD_DIMENSIONS && blockY + i >= 0 && blockY + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX - dist + i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            totalPassDensity += blockTargetDensity;
         }
         // Top left
         if (blockX - i >= 0 && blockX - i < BLOCKS_IN_BOARD_DIMENSIONS && blockY - dist + i >= 0 && blockY - dist + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY - dist + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX - i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            totalPassDensity += blockTargetDensity;
         }
      }

      const totalUsedDensity = Math.min(remainingDensity, totalPassDensity);
      if (totalUsedDensity === 0) {
         // Empty passes should stop the search
         break;
      }

      for (let i = 0; i <= dist; i++) {
         // Top right
         if (blockX + i >= 0 && blockX + i < BLOCKS_IN_BOARD_DIMENSIONS && blockY - dist + i >= 0 && blockY - dist + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY - dist + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX + i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            const usedDensity = totalUsedDensity * blockTargetDensity / totalPassDensity;
            densityInfos.push({
               blockIdx: blockIdx,
               density: usedDensity
            });
         }
         // Bottom right
         if (blockX + dist - i >= 0 && blockX + dist - i < BLOCKS_IN_BOARD_DIMENSIONS && blockY + i >= 0 && blockY + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX + dist - i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            const usedDensity = totalUsedDensity * blockTargetDensity / totalPassDensity;
            densityInfos.push({
               blockIdx: blockIdx,
               density: usedDensity
            });
         }
         // Bottom left
         if (blockX - dist + i >= 0 && blockX - dist + i < BLOCKS_IN_BOARD_DIMENSIONS && blockY + i >= 0 && blockY + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX - dist + i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            const usedDensity = totalUsedDensity * blockTargetDensity / totalPassDensity;
            densityInfos.push({
               blockIdx: blockIdx,
               density: usedDensity
            });
         }
         // Top left
         if (blockX - i >= 0 && blockX - i < BLOCKS_IN_BOARD_DIMENSIONS && blockY - dist + i >= 0 && blockY - dist + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY - dist + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX - i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            const usedDensity = totalUsedDensity * blockTargetDensity / totalPassDensity;
            densityInfos.push({
               blockIdx: blockIdx,
               density: usedDensity
            });
         }
      }

      remainingDensity -= totalUsedDensity;
   }

   spawnDistribution.entityDensityMap.set(entity, densityInfos);

   // Affect the current densities
   for (const densityInfo of densityInfos) {
      spawnDistribution.currentDensities[densityInfo.blockIdx] += densityInfo.density;
   }
}

const createEntitySpawnInfo = (params: EntitySpawnInfoParams): EntitySpawnInfo => {
   createBaseSpawnDistribution(params);

   return {
      entityType: params.entityType,
      layer: params.layer,
      spawnRate: params.spawnRate,
      spawnableTileTypes: params.spawnableTileTypes,
      onlySpawnsInNight: params.onlySpawnsInNight,
      minSpawnDistance: params.minSpawnDistance,
      packSpawning: params.packSpawning,
      spawnDistribution: params.rawSpawnDistribution,
      balanceSpawnDistribution: params.balanceSpawnDistribution,
      createEntity: params.createEntity,
      customSpawnIsValidFunc: params.customSpawnIsValidFunc
   };
}

export function registerNewSpawnInfo(params: EntitySpawnInfoParams): void {
   const spawnInfo = createEntitySpawnInfo(params);
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

export function spawnPositionLacksDensity(spawnInfo: EntitySpawnInfo, x: number, y: number): boolean {
   const spawnDistribution = spawnInfo.spawnDistribution;
   const blockSize = spawnDistribution.blockSize;
   
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.BOARD_DIMENSIONS / blockSize;

   const blockX = Math.floor(x / Settings.TILE_SIZE / blockSize);
   const blockY = Math.floor(y / Settings.TILE_SIZE / blockSize);
   const blockIdx = blockY * BLOCKS_IN_BOARD_DIMENSIONS + blockX;

   const currentDensity = spawnDistribution.currentDensities[blockIdx];
   const targetDensity = spawnDistribution.targetDensities[blockIdx];
   return currentDensity < targetDensity;
}

// @Cleanup: won't be necessary once stepping stones are entities (can just use the getentitiesinrange function)
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