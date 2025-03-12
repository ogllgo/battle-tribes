import { WaterRockData, RiverSteppingStoneData } from "battletribes-shared/client-server-types";
import { TileType } from "battletribes-shared/tiles";
import { getTileIndexIncludingEdges, smoothstep } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { generateOctavePerlinNoise, generatePerlinNoise, generatePointPerlinNoise } from "../perlin-noise";
import BIOME_GENERATION_INFO, { BIOME_GENERATION_PRIORITY, BiomeSpawnRequirements, TileGenerationInfo } from "./terrain-generation-info";
import { WaterTileGenerationInfo, generateRiverFeatures, generateRiverTiles } from "./river-generation";
import OPTIONS from "../options";
import Layer from "../Layer";
import { generateCaveEntrances } from "./cave-entrance-generation";
import { groupLocalBiomes, setWallInSubtiles } from "./terrain-generation-utils";
import { Biome } from "../../../shared/src/biomes";
import { EntitySpawnInfo, isTooCloseToSteppingStone, registerNewSpawnInfo } from "../entity-spawn-info";
import { EntityType } from "../../../shared/src/entities";
import { createBalancedSpawnDistribution } from "../balanced-spawn-distributions";
import { getEntitiesInRange } from "../ai-shared";
import { getEntityType } from "../world";
import { TransformComponentArray } from "../components/TransformComponent";
import { entityIsTribesman } from "../entities/tribes/tribe-member";
import { Hitbox } from "../hitboxes";
import { entityIsStructure } from "../structure-placement";

const enum Vars {
   TRIBESMAN_SPAWN_EXCLUSION_RANGE = 1200
}

export interface TerrainGenerationInfo {
   readonly tileTypes: Float32Array;
   readonly tileBiomes: Float32Array;
   readonly subtileTypes: Float32Array;
   readonly riverFlowDirections: Float32Array;
   readonly tileTemperatures: Float32Array;
   readonly tileHumidities: Float32Array;
   readonly riverMainTiles: ReadonlyArray<WaterTileGenerationInfo>;
   readonly waterRocks: ReadonlyArray<WaterRockData>;
   readonly riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;
}

const HEIGHT_NOISE_SCALE = 50;
const TEMPERATURE_NOISE_SCALE = 120;
const HUMIDITY_NOISE_SCALE = 30;

export let riverMainTiles: ReadonlyArray<WaterTileGenerationInfo>;

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

            // @HACK
            
            const transformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = transformComponent.children[0] as Hitbox;
            
            const distanceSquared = Math.pow(x - entityHitbox.box.position.x, 2) + Math.pow(y - entityHitbox.box.position.y, 2);
            if (distanceSquared <= Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE * Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) {
               return false;
            }
         }
      }
   }

   return true;
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

const matchesBiomeRequirements = (generationInfo: BiomeSpawnRequirements, height: number, temperature: number, humidity: number): boolean => {
   // Height
   if (typeof generationInfo.minHeight !== "undefined" && height < generationInfo.minHeight) return false;
   if (typeof generationInfo.maxHeight !== "undefined" && height > generationInfo.maxHeight) return false;
   
   // Temperature
   if (typeof generationInfo.minTemperature !== "undefined" && temperature < generationInfo.minTemperature) return false;
   if (typeof generationInfo.maxTemperature !== "undefined" && temperature > generationInfo.maxTemperature) return false;
   
   // Humidity
   if (typeof generationInfo.minHumidity !== "undefined" && humidity < generationInfo.minHumidity) return false;
   if (typeof generationInfo.maxHumidity !== "undefined" && humidity > generationInfo.maxHumidity) return false;

   return true;
}

const getBiome = (height: number, temperature: number, humidity: number): Biome => {
   // @Speed
   const numBiomes = Object.keys(BIOME_GENERATION_INFO).length;

   for (let i = 0; i < numBiomes; i++) {
      const biome = BIOME_GENERATION_PRIORITY[i];
      
      const generationInfo = BIOME_GENERATION_INFO[biome];
      if (typeof generationInfo !== "undefined" && generationInfo.spawnRequirements !== null && matchesBiomeRequirements(generationInfo.spawnRequirements, height, temperature, humidity)) {
         return biome;
      }
   }
   
   throw new Error(`Couldn't find a valid biome! Height: ${height}, temperature: ${temperature}, humidity: ${humidity}`);
}

export function getTileDist(tileBiomes: Float32Array, tileX: number, tileY: number, maxSearchDist: number): number {
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   const tileBiome = tileBiomes[tileIndex] as Biome;

   for (let dist = 1; dist <= maxSearchDist; dist++) {
      for (let i = 0; i <= dist; i++) {
         // Top right
         if (tileX + i >= -Settings.EDGE_GENERATION_DISTANCE && tileX + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const topRightBiome = tileBiomes[getTileIndexIncludingEdges(tileX + i, tileY - dist + i)];
            if (topRightBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Bottom right
         if (tileX + dist - i >= -Settings.EDGE_GENERATION_DISTANCE && tileX + dist - i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const bottomRightBiome = tileBiomes[getTileIndexIncludingEdges(tileX + dist - i, tileY + i)];
            if (bottomRightBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Bottom left
         if (tileX - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileX - dist + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const bottomLeftBiome = tileBiomes[getTileIndexIncludingEdges(tileX - dist + i, tileY + i)];
            if (bottomLeftBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Top left
         if (tileX - i >= -Settings.EDGE_GENERATION_DISTANCE && tileX - i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const topLeftBiome = tileBiomes[getTileIndexIncludingEdges(tileX - i, tileY - dist + i)];
            if (topLeftBiome !== tileBiome) {
               return dist - 1;
            }
         }
      }
   }

   return maxSearchDist;
}

const getTileGenerationInfo = <T extends TileGenerationInfo>(tileBiomes: Float32Array, biome: Biome, tileGenerationArray: ReadonlyArray<T>, tileX: number, tileY: number): T | undefined => {
   // @Speed: Pre-calculate this for each biome
   /** The maximum distance that the algorithm will search for */
   let maxSearchDist = 0;
   for (let i = 0; i < tileGenerationArray.length; i++) {
      const tileGenerationInfo = tileGenerationArray[i];
      const requirements = tileGenerationInfo.requirements;
      if (typeof requirements !== "undefined") {
         if (typeof requirements.minDist !== "undefined" && requirements.minDist > maxSearchDist) {
            maxSearchDist = requirements.minDist;
         }
         if (typeof requirements.maxDist !== "undefined" && requirements.maxDist >= maxSearchDist) {
            maxSearchDist = requirements.maxDist + 1;
         }
      }
   }
         
   // @Speed: There are many tiles which don't need this information
   const dist = getTileDist(tileBiomes, tileX, tileY, maxSearchDist);
   
   for (const tileGenerationInfo of tileGenerationArray) {
      if (typeof tileGenerationInfo.requirements === "undefined") {
         return tileGenerationInfo;
      }

      let weight = 0;
      if (typeof tileGenerationInfo.requirements.noise !== "undefined") {
         // @Speed @Garbage
         weight = generatePointPerlinNoise(tileX, tileY, tileGenerationInfo.requirements.noise.scale, biome + "-" + tileGenerationInfo.requirements.noise.scale);
      }
      
      // Check requirements
      const requirements = tileGenerationInfo.requirements;
      if (typeof requirements.noise !== "undefined") {
         if (typeof requirements.noise.minWeight !== "undefined" && weight < requirements.noise.minWeight) continue;
         if (typeof requirements.noise.maxWeight !== "undefined" && weight > requirements.noise.maxWeight) continue;
      }

      if (typeof requirements.minDist !== "undefined" && dist < requirements.minDist) continue;
      if (typeof requirements.maxDist !== "undefined" && dist > requirements.maxDist) continue;
      
      return tileGenerationInfo;
   }
}

/** Generate the tile array's tile types based on their biomes */
export function generateTileInfo(tileBiomes: Float32Array, tileTypes: Float32Array, subtileTypes: Float32Array): void {
   for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
      for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         
         const biome = tileBiomes[tileIndex] as Biome;
         const biomeGenerationInfo = BIOME_GENERATION_INFO[biome]!;

         const floorTileGenerationInfo = getTileGenerationInfo(tileBiomes, biome, biomeGenerationInfo.floorTiles, tileX, tileY);
         if (typeof floorTileGenerationInfo === "undefined") {
            throw new Error(`Couldn't find a valid floor tile generation info! Biome: ${biome}`);
         }
         const wallTileGenerationInfo = getTileGenerationInfo(tileBiomes, biome, biomeGenerationInfo.wallTiles, tileX, tileY);

         tileTypes[tileIndex] = floorTileGenerationInfo.tileType;
         
         if (OPTIONS.generateWalls && typeof wallTileGenerationInfo !== "undefined") {
            setWallInSubtiles(subtileTypes, tileX, tileY, wallTileGenerationInfo.subtileType)
         }
      }
   }
}

export function generateSurfaceTerrain(surfaceLayer: Layer): void {
   for (let i = 0; i < surfaceLayer.ambientLightFactors.length; i++) {
      surfaceLayer.ambientLightFactors[i] = 1;
   }

   // Generate the noise
   const heightMap = generateOctavePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, HEIGHT_NOISE_SCALE, 3, 1.5, 0.75);
   const temperatureMap = generatePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, TEMPERATURE_NOISE_SCALE);
   const humidityMap = generatePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, HUMIDITY_NOISE_SCALE);

   // Fill temperature and humidity arrays
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         
         const rawTemperature = temperatureMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         surfaceLayer.tileTemperatures[tileIndex] = smoothstep(rawTemperature);
         
         const rawHumidity = humidityMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         surfaceLayer.tileHumidities[tileIndex] = smoothstep(rawHumidity);
      }
   }
   
   // Fill tile biomes
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const height = heightMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         const temperature = temperatureMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         const humidity = humidityMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];

         // @Temporary
         let biome = getBiome(height, temperature, humidity);
         // if (biome === Biome.mountains || biome === Biome.desert) {
         //    biome = Biome.tundra;
         // }
         if (biome !== Biome.mountains) {
            biome = Biome.grasslands;
         }
         
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         surfaceLayer.tileBiomes[tileIndex] = biome;
      }
   }

   // Generate rivers
   let riverTiles: ReadonlyArray<WaterTileGenerationInfo>;
   if (OPTIONS.generateRivers) {
      const riverGenerationInfo = generateRiverTiles();
      riverTiles = riverGenerationInfo.waterTiles;
      riverMainTiles = riverGenerationInfo.riverMainTiles;
   } else {
      riverTiles = [];
      riverMainTiles = [];
   }

   // Generate tiles
   generateTileInfo(surfaceLayer.tileBiomes, surfaceLayer.tileTypes, surfaceLayer.wallSubtileTypes);

   // Create flow directions array and create ice rivers
   for (const tileInfo of riverTiles) {
      const tileIndex = getTileIndexIncludingEdges(tileInfo.tileX, tileInfo.tileY);
      
      // Make ice rivers
      if (surfaceLayer.tileBiomes[tileIndex] === Biome.tundra) {
         surfaceLayer.tileTypes[tileIndex] = TileType.ice;
      } else {
         surfaceLayer.tileBiomes[tileIndex] = Biome.river;
         surfaceLayer.tileTypes[tileIndex] = TileType.water;
      }
      
      // @Incomplete
      // tileIsWalls[tileIndex] = 0;

      surfaceLayer.riverFlowDirections[tileIndex] = tileInfo.flowDirectionIdx;
   }

   generateRiverFeatures(riverTiles, surfaceLayer.waterRocks, surfaceLayer.riverSteppingStones);

   groupLocalBiomes(surfaceLayer);

   if (OPTIONS.generateCaves) {
      generateCaveEntrances(surfaceLayer);
   }

   registerNewSpawnInfo({
      entityType: EntityType.cow,
      layer: surfaceLayer,
      spawnRate: 0.01,
      maxDensity: 0.004,
      spawnableTileTypes: [TileType.grass],
      packSpawning: {
         minPackSize: 2,
         maxPackSize: 5,
         spawnRange: 200
      },
      onlySpawnsInNight: false,
      minSpawnDistance: 150
   });
   registerNewSpawnInfo({
      entityType: EntityType.berryBush,
      layer: surfaceLayer,
      spawnRate: 0.001,
      maxDensity: 0.0025,
      spawnableTileTypes: [TileType.grass],
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      spawnDistribution: createBalancedSpawnDistribution()
   });
   registerNewSpawnInfo({
      entityType: EntityType.tree,
      layer: surfaceLayer,
      spawnRate: 0.013,
      maxDensity: 0.02,
      spawnableTileTypes: [TileType.grass],
      onlySpawnsInNight: false,
      minSpawnDistance: 75,
      spawnDistribution: createBalancedSpawnDistribution()
   });
   registerNewSpawnInfo({
      entityType: EntityType.tombstone,
      layer: surfaceLayer,
      spawnRate: 0.01,
      // maxDensity: 0.003,
      maxDensity: 0,
      spawnableTileTypes: [TileType.grass],
      onlySpawnsInNight: true,
      minSpawnDistance: 150
   });
   registerNewSpawnInfo({
      entityType: EntityType.boulder,
      layer: surfaceLayer,
      spawnRate: 0.005,
      // maxDensity: 0.025,
      maxDensity: 0,
      spawnableTileTypes: [TileType.rock],
      onlySpawnsInNight: false,
      minSpawnDistance: 60,
      spawnDistribution: createBalancedSpawnDistribution()
   });
   registerNewSpawnInfo({
      entityType: EntityType.cactus,
      layer: surfaceLayer,
      spawnRate: 0.005,
      maxDensity: 0.03,
      spawnableTileTypes: [TileType.sand],
      onlySpawnsInNight: false,
      minSpawnDistance: 75,
      spawnDistribution: createBalancedSpawnDistribution()
   });
   registerNewSpawnInfo({
      entityType: EntityType.yeti,
      layer: surfaceLayer,
      spawnRate: 0.004,
      maxDensity: 0.008,
      spawnableTileTypes: [TileType.snow],
      onlySpawnsInNight: false,
      minSpawnDistance: 150
   });
   registerNewSpawnInfo({
      entityType: EntityType.iceSpikes,
      layer: surfaceLayer,
      spawnRate: 0.015,
      maxDensity: 0.06,
      spawnableTileTypes: [TileType.ice, TileType.permafrost],
      onlySpawnsInNight: false,
      minSpawnDistance: 150
   });
   registerNewSpawnInfo({
      entityType: EntityType.slimewisp,
      layer: surfaceLayer,
      spawnRate: 0.2,
      maxDensity: 0.3,
      spawnableTileTypes: [TileType.slime],
      onlySpawnsInNight: false,
      minSpawnDistance: 50
   });
   // @HACK @ROBUSTNESS: This is just here so that when tribesmen want to kill slimes, it registers where slimes can be found...
   // but this should instead be inferred from the fact that slimewisps merge together to make slimes!
   registerNewSpawnInfo({
      entityType: EntityType.slime,
      layer: surfaceLayer,
      spawnRate: 0,
      maxDensity: 0,
      spawnableTileTypes: [TileType.slime],
      onlySpawnsInNight: false,
      minSpawnDistance: 50
   });
   registerNewSpawnInfo({
      entityType: EntityType.krumblid,
      layer: surfaceLayer,
      spawnRate: 0.005,
      maxDensity: 0.015,
      spawnableTileTypes: [TileType.sand],
      onlySpawnsInNight: false,
      minSpawnDistance: 150
   });
   registerNewSpawnInfo({
      entityType: EntityType.frozenYeti,
      layer: surfaceLayer,
      spawnRate: 0.004,
      maxDensity: 0.008,
      spawnableTileTypes: [TileType.fimbultur],
      onlySpawnsInNight: false,
      minSpawnDistance: 150
   });
   registerNewSpawnInfo({
      entityType: EntityType.fish,
      layer: surfaceLayer,
      spawnRate: 0.015,
      maxDensity: 0.03,
      spawnableTileTypes: [TileType.water],
      packSpawning: {
         minPackSize: 3,
         maxPackSize: 4,
         spawnRange: 200
      },
      onlySpawnsInNight: false,
      minSpawnDistance: 150
   });
   registerNewSpawnInfo({
      entityType: EntityType.lilypad,
      layer: surfaceLayer,
      spawnRate: 0,
      maxDensity: 0.03,
      spawnableTileTypes: [TileType.water],
      packSpawning: {
         minPackSize: 2,
         maxPackSize: 3,
         spawnRange: 200
      },
      onlySpawnsInNight: false,
      minSpawnDistance: 0,
      customSpawnIsValidFunc: (spawnInfo: EntitySpawnInfo, x: number, y: number): boolean => {
         return !isTooCloseToSteppingStone(x, y, 50) && !isTooCloseToReedOrLilypad(spawnInfo.layer, x, y);
      }
   });
   registerNewSpawnInfo({
      entityType: EntityType.golem,
      layer: surfaceLayer,
      spawnRate: 0.002,
      maxDensity: 0.004,
      spawnableTileTypes: [TileType.rock],
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      spawnDistribution: createBalancedSpawnDistribution()
   });
   if (OPTIONS.spawnTribes) {
      registerNewSpawnInfo({
         entityType: EntityType.tribeWorker,
         layer: surfaceLayer,
         spawnRate: 0.002,
         maxDensity: 0.002,
         spawnableTileTypes: [TileType.grass, TileType.rock, TileType.sand, TileType.snow, TileType.ice],
         onlySpawnsInNight: false,
         minSpawnDistance: 100,
         customSpawnIsValidFunc(spawnInfo, spawnOriginX, spawnOriginY) {
            return tribesmanSpawnPositionIsValid(spawnInfo.layer, spawnOriginX, spawnOriginY);
         }
      });
   }
}