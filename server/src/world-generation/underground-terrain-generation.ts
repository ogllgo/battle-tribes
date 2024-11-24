import { Settings } from "battletribes-shared/settings";
import { SubtileType, TileType } from "battletribes-shared/tiles";
import { distance, smoothstep } from "battletribes-shared/utils";
import Layer, { getTileIndexIncludingEdges } from "../Layer";
import { generateOctavePerlinNoise, generatePerlinNoise } from "../perlin-noise";
import { groupLocalBiomes, setWallInSubtiles } from "./terrain-generation-utils";
import { Biome } from "../../../shared/src/biomes";

const enum Vars {
   DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE = 9
}

const spreadDropdownCloseness = (dropdownTileX: number, dropdownTileY: number, closenessArray: Float32Array): void => {
   const minTileX = Math.max(dropdownTileX - Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, -Settings.EDGE_GENERATION_DISTANCE);
   const maxTileX = Math.min(dropdownTileX + Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE - 1);
   const minTileY = Math.max(dropdownTileY - Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, -Settings.EDGE_GENERATION_DISTANCE);
   const maxTileY = Math.min(dropdownTileY + Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE - 1);
   
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         let distTiles = distance(tileX, tileY, dropdownTileX, dropdownTileY);
         if (distTiles > Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE) {
            distTiles = Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE;
         }

         let closeness = Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE - distTiles;
         closeness /= Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE;
         closeness = smoothstep(closeness);

         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (closeness > closenessArray[tileIndex]) {
            closenessArray[tileIndex] = closeness;
         }
      }
   }
}

const generateDropdownClosenessArray = (surfaceLayer: Layer): Float32Array => {
   const closenessArray = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tileType = surfaceLayer.tileTypes[tileIndex];
         if (tileType === TileType.dropdown) {
            spreadDropdownCloseness(tileX, tileY, closenessArray);
         }
      }
   }

   return closenessArray;
}

export function generateUndergroundTerrain(surfaceLayer: Layer, undergroundLayer: Layer): void {
   const weightMap = generateOctavePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, 35, 12, 1.75, 0.65);
   const dropdownClosenessArray = generateDropdownClosenessArray(surfaceLayer);

   const waterGenerationNoise = generatePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, 8);
   
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         let weight = weightMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const dropdownCloseness = dropdownClosenessArray[tileIndex];

         weight *= 1 - dropdownCloseness;
         
         undergroundLayer.tileBiomes[tileIndex] = Biome.caves;

         if (weight > 0.57) {
            undergroundLayer.tileTypes[tileIndex] = TileType.stoneWallFloor;
            setWallInSubtiles(undergroundLayer.wallSubtileTypes, tileX, tileY, SubtileType.stoneWall);
         } else {
            const waterWeight = waterGenerationNoise[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
            if (weight < 0.5 && weight > 0.45 && waterWeight > 0.65) {
               undergroundLayer.tileTypes[tileIndex] = TileType.water;
            } else {
               undergroundLayer.tileTypes[tileIndex] = TileType.stone;
            }
         }
      }
   }
   
   groupLocalBiomes(undergroundLayer);
}