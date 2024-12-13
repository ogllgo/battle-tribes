import { Settings } from "battletribes-shared/settings";
import { SubtileType, TileType } from "battletribes-shared/tiles";
import { distance, randFloat, smoothstep } from "battletribes-shared/utils";
import Layer, { getTileIndexIncludingEdges } from "../Layer";
import { generateOctavePerlinNoise, generatePerlinNoise } from "../perlin-noise";
import { groupLocalBiomes, setWallInSubtiles } from "./terrain-generation-utils";
import { Biome } from "../../../shared/src/biomes";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { createTreeRootBaseConfig } from "../entities/resources/tree-root-base";
import { ServerComponentType } from "../../../shared/src/components";
import { createEntity } from "../Entity";
import { getEntityType, pushJoinBuffer } from "../world";
import { generateSpikyBastards } from "./spiky-bastard-generation";
import { getEntitiesInRange } from "../ai-shared";
import { EntityType } from "../../../shared/src/entities";

const enum Vars {
   DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE = 9,
   TREE_ROOT_SPAWN_ATTEMPT_DENSITY = 0.5
}

const NEIGHBOUR_TILE_OFFSETS: ReadonlyArray<[number, number]> = [
   [-1, 0],
   [1, 0],
   [0, -1],
   [0, 1]
];

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

   generateSpikyBastards();

   // Generate tree roots
   const numAttempts = Math.floor(Settings.BOARD_DIMENSIONS * Settings.BOARD_DIMENSIONS * Vars.TREE_ROOT_SPAWN_ATTEMPT_DENSITY);
   for (let i = 0; i < numAttempts; i++) {
      const tileX = Math.floor(Math.random() * Settings.BOARD_DIMENSIONS);
      const tileY = Math.floor(Math.random() * Settings.BOARD_DIMENSIONS);

      // Make sure the tile is a wall tile
      if (!undergroundLayer.subtileIsWall(getSubtileIndex(tileX * 4, tileY * 4))) {
         continue;
      }

      // Make sure the tile is below a grasslands biome
      if (surfaceLayer.getTileXYBiome(tileX, tileY) !== Biome.grasslands) {
         continue;
      }

      const xyOffset = NEIGHBOUR_TILE_OFFSETS[Math.floor(Math.random() * 4)];

      const frontTileX = tileX + xyOffset[0];
      const frontTileY = tileY + xyOffset[1];

      // Make sure the front isn't a wall tile
      if (undergroundLayer.subtileIsWall(getSubtileIndex(frontTileX * 4, frontTileY * 4))) {
         continue;
      }

      let x: number;
      let y: number;
      if (xyOffset[0] !== 0) {
         x = (tileX + frontTileX + 1) * 0.5 * Settings.TILE_SIZE + 1 * xyOffset[0];
         y = (tileY + randFloat(0.2, 0.8)) * Settings.TILE_SIZE;
      } else {
         x = (tileX + randFloat(0.2, 0.8)) * Settings.TILE_SIZE;
         y = (tileY + frontTileY + 1) * 0.5 * Settings.TILE_SIZE + 1 * xyOffset[1];
      }

      // Don't spawn too close to spiky bastards or other tree roots
      const entities = getEntitiesInRange(undergroundLayer, x, y, 54);
      let isValid = true;
      for (const entity of entities) {
         const entityType = getEntityType(entity);
         if (entityType === EntityType.spikyBastard || entityType === EntityType.treeRootBase || entityType === EntityType.treeRootSegment) {
            isValid = false;
            break;
         }
      }
      if (!isValid) {
         continue;
      }
      
      const treeRoot = createTreeRootBaseConfig();
      treeRoot.components[ServerComponentType.transform].position.x = x;
      treeRoot.components[ServerComponentType.transform].position.y = y;
      treeRoot.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      createEntity(treeRoot, undergroundLayer, 0);

      pushJoinBuffer(false);
   }
   
   groupLocalBiomes(undergroundLayer);
}