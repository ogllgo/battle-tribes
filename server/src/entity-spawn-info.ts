import { RIVER_STEPPING_STONE_SIZES } from "../../shared/src/client-server-types";
import { EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { entityIsStructure } from "../../shared/src/structures";
import { TileType } from "../../shared/src/tiles";
import { distance } from "../../shared/src/utils";
import { getEntitiesInRange } from "./ai-shared";
import { TransformComponentArray } from "./components/TransformComponent";
import { yetiSpawnPositionIsValid } from "./components/YetiComponent";
import { entityIsTribesman } from "./entities/tribes/tribe-member";
import Layer from "./Layer";
import { surfaceLayer, undergroundLayer } from "./layers";
import OPTIONS from "./options";
import { getEntityType } from "./world";

const enum Vars {
   TRIBESMAN_SPAWN_EXCLUSION_RANGE = 2000
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
      layer: surfaceLayer,
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
      layer: surfaceLayer,
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
      layer: surfaceLayer,
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
      layer: surfaceLayer,
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
      layer: surfaceLayer,
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
      layer: undergroundLayer,
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
      layer: surfaceLayer,
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
      layer: surfaceLayer,
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
      layer: surfaceLayer,
      spawnRate: 0.015,
      maxDensity: 0.06,
      spawnableTileTypes: [TileType.ice, TileType.permafrost],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   // @Temporary @Hack: Because slimes having too many orbs causes the client to crash...
   // {
   //    entityType: EntityType.slimewisp,
   //    layer: surfaceLayer,
   //    spawnRate: 0.2,
   //    maxDensity: 0.3,
   //    spawnableTileTypes: [TileType.slime],
   //    minPackSize: 1,
   //    maxPackSize: 1,
   //    onlySpawnsInNight: false,
   //    minSpawnDistance: 50,
   //    usesSpawnDistribution: false
   // },
   {
      entityType: EntityType.krumblid,
      layer: surfaceLayer,
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
      layer: surfaceLayer,
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
      layer: surfaceLayer,
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
      layer: surfaceLayer,
      spawnRate: 0,
      maxDensity: 0.03,
      spawnableTileTypes: [TileType.water],
      minPackSize: 2,
      maxPackSize: 3,
      onlySpawnsInNight: false,
      minSpawnDistance: 0,
      usesSpawnDistribution: false,
      customSpawnIsValidFunc: (spawnInfo: EntitySpawnInfo, x: number, y: number): boolean => {
         return !isTooCloseToSteppingStone(x, y, 50) && !isTooCloseToReedOrLilypad(spawnInfo.layer, x, y);
      }
   },
   {
      entityType: EntityType.golem,
      layer: surfaceLayer,
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
      layer: surfaceLayer,
      spawnRate: 0.002,
      maxDensity: 0.002,
      spawnableTileTypes: [TileType.grass, TileType.rock, TileType.sand, TileType.snow, TileType.ice],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 100,
      usesSpawnDistribution: false,
      customSpawnIsValidFunc(spawnInfo, spawnOriginX, spawnOriginY) {
         return tribesmanSpawnPositionIsValid(spawnInfo.layer, spawnOriginX, spawnOriginY);
      }
   },
   {
      entityType: EntityType.glurb,
      layer: undergroundLayer,
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

const isTooCloseToReedOrLilypad = (layer: Layer, x: number, y: number): boolean => {
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