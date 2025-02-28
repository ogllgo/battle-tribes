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
         biome = Biome.grasslands;
         
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
}