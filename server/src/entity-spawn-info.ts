import { EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { entityIsStructure } from "../../shared/src/structures";
import { TileType } from "../../shared/src/tiles";
import { isTooCloseToReedOrLilypad, isTooCloseToSteppingStone } from "./Chunk";
import { TransformComponentArray } from "./components/TransformComponent";
import { yetiSpawnPositionIsValid } from "./components/YetiComponent";
import { entityIsTribesman } from "./entities/tribes/tribe-member";
import Layer from "./Layer";
import OPTIONS from "./options";
import { LayerType, getEntityType, getLayerByType } from "./world";

const enum Vars {
   TRIBESMAN_SPAWN_EXCLUSION_RANGE = 2000
}

export interface EntitySpawnInfo {
   /** The type of entity to spawn */
   readonly entityType: EntityType;
   // @Hack @Cleanup: make this reference the actual layers
   readonly layerType: LayerType;
   /** Average number of spawn attempts that happen each second per chunk. */
   readonly spawnRate: number;
   /** Maximum global density per tile the entity type can have. */
   readonly maxDensity: number;
   readonly spawnableTileTypes: ReadonlyArray<TileType>;
   readonly minPackSize: number;
   readonly maxPackSize: number;
   readonly onlySpawnsInNight: boolean;
   /** Minimum distance a spawn event can occur from another entity */
   readonly minSpawnDistance: number;
   readonly usesSpawnDistribution: boolean;
   readonly customSpawnIsValidFunc?: (spawnInfo: EntitySpawnInfo, spawnOriginX: number, spawnOriginY: number) => boolean;
}

export const SPAWN_INFOS = [
   {
      entityType: EntityType.cow,
      layerType: LayerType.surface,
      spawnRate: 0.01,
      maxDensity: 0.004,
      spawnableTileTypes: [TileType.grass],
      minPackSize: 2,
      maxPackSize: 5,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.berryBush,
      layerType: LayerType.surface,
      spawnRate: 0.001,
      maxDensity: 0.0025,
      spawnableTileTypes: [TileType.grass],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: true
   },
   {
      entityType: EntityType.tree,
      layerType: LayerType.surface,
      spawnRate: 0.013,
      maxDensity: 0.02,
      spawnableTileTypes: [TileType.grass],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 75,
      usesSpawnDistribution: true
   },
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
   {
      entityType: EntityType.tombstone,
      layerType: LayerType.surface,
      spawnRate: 0.01,
      maxDensity: 0.003,
      spawnableTileTypes: [TileType.grass],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: true,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.boulder,
      layerType: LayerType.surface,
      spawnRate: 0.005,
      maxDensity: 0.025,
      spawnableTileTypes: [TileType.rock],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 60,
      usesSpawnDistribution: true
   },
   {
      entityType: EntityType.boulder,
      layerType: LayerType.underground,
      spawnRate: 0.005,
      maxDensity: 0.025,
      spawnableTileTypes: [TileType.stone],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 60,
      usesSpawnDistribution: true
   },
   {
      entityType: EntityType.cactus,
      layerType: LayerType.surface,
      spawnRate: 0.005,
      maxDensity: 0.03,
      spawnableTileTypes: [TileType.sand],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 75,
      usesSpawnDistribution: true
   },
   {
      entityType: EntityType.yeti,
      layerType: LayerType.surface,
      spawnRate: 0.004,
      maxDensity: 0.008,
      spawnableTileTypes: [TileType.snow],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false,
      customSpawnIsValidFunc(_spawnInfo, spawnOriginX, spawnOriginY) {
         return yetiSpawnPositionIsValid(spawnOriginX, spawnOriginY);
      }
   },
   {
      entityType: EntityType.iceSpikes,
      layerType: LayerType.surface,
      spawnRate: 0.015,
      maxDensity: 0.06,
      spawnableTileTypes: [TileType.ice, TileType.permafrost],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.slimewisp,
      layerType: LayerType.surface,
      spawnRate: 0.2,
      maxDensity: 0.3,
      spawnableTileTypes: [TileType.slime],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 50,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.krumblid,
      layerType: LayerType.surface,
      spawnRate: 0.005,
      maxDensity: 0.015,
      spawnableTileTypes: [TileType.sand],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.frozenYeti,
      layerType: LayerType.surface,
      spawnRate: 0.004,
      maxDensity: 0.008,
      spawnableTileTypes: [TileType.fimbultur],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.fish,
      layerType: LayerType.surface,
      spawnRate: 0.015,
      maxDensity: 0.03,
      spawnableTileTypes: [TileType.water],
      minPackSize: 3,
      maxPackSize: 4,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.lilypad,
      layerType: LayerType.surface,
      spawnRate: 0,
      maxDensity: 0.03,
      spawnableTileTypes: [TileType.water],
      minPackSize: 2,
      maxPackSize: 3,
      onlySpawnsInNight: false,
      minSpawnDistance: 0,
      usesSpawnDistribution: false,
      customSpawnIsValidFunc: (spawnInfo: EntitySpawnInfo, x: number, y: number): boolean => {
         return !isTooCloseToSteppingStone(x, y, 50) && !isTooCloseToReedOrLilypad(getLayerByType(spawnInfo.layerType), x, y);
      }
   },
   {
      entityType: EntityType.golem,
      layerType: LayerType.surface,
      spawnRate: 0.002,
      maxDensity: 0.004,
      spawnableTileTypes: [TileType.rock],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: true
   },
   {
      entityType: EntityType.tribeWorker,
      layerType: LayerType.surface,
      spawnRate: 0.002,
      maxDensity: 0.002,
      spawnableTileTypes: [TileType.grass, TileType.rock, TileType.sand, TileType.snow, TileType.ice],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 100,
      usesSpawnDistribution: false,
      customSpawnIsValidFunc(spawnInfo, spawnOriginX, spawnOriginY) {
         const layer = getLayerByType(spawnInfo.layerType);
         return tribesmanSpawnPositionIsValid(layer, spawnOriginX, spawnOriginY);
      }
   },
   {
      entityType: EntityType.glurb,
      layerType: LayerType.underground,
      spawnRate: 0.0025,
      maxDensity: 0.004,
      spawnableTileTypes: [TileType.stone],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 100,
      usesSpawnDistribution: true
   }
] satisfies ReadonlyArray<EntitySpawnInfo>;

export type SpawningEntityType = (typeof SPAWN_INFOS)[number]["entityType"];

const tribesmanSpawnPositionIsValid = (layer: Layer, x: number, y: number): boolean => {
   if (!OPTIONS.spawnTribes) {
      return false;
   }
   
   // @Cleanup: copy and paste
   
   const minChunkX = Math.max(Math.min(Math.floor((x - Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((x + Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((y - Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((y + Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            const entityType = getEntityType(entity);
            if (!entityIsStructure(entityType) && !entityIsTribesman(entityType)) {
               continue;
            }

            const transformComponent = TransformComponentArray.getComponent(entity);
            
            const distanceSquared = Math.pow(x - transformComponent.position.x, 2) + Math.pow(y - transformComponent.position.y, 2);
            if (distanceSquared <= Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE * Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) {
               return false;
            }
         }
      }
   }

   return true;
}