import { Settings } from "battletribes-shared/settings";
import { SubtileType, TileType } from "battletribes-shared/tiles";
import { distance, getTileIndexIncludingEdges, getTileX, getTileY, lerp, randFloat, smoothstep, TileIndex } from "battletribes-shared/utils";
import Layer from "../Layer";
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
import { getLightLevelNode } from "../light-levels";
import { LightLevelVars } from "../../../shared/src/light-levels";
import { generateMithrilOre } from "./mithril-ore-generation";

const enum Vars {
   DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE = 9,
   TREE_ROOT_SPAWN_ATTEMPT_DENSITY = 0.5,
   MIN_MITHRIL_GENERATION_WEIGHT = 0.65
}

const NEIGHBOUR_TILE_OFFSETS: ReadonlyArray<[number, number]> = [
   [-1, 0],
   [1, 0],
   [0, -1],
   [0, 1]
];

const propagateAmbientLightFactor = (ambientLightFactors: Float32Array, nodeX: number, nodeY: number): void => {
   // @Hack
   const RANGE = 80;

   const minNodeX = Math.max(nodeX - RANGE, -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxNodeX = Math.min(nodeX + RANGE, (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   const minNodeY = Math.max(nodeY - RANGE, -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxNodeY = Math.min(nodeY + RANGE, (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   
   // @Speed: only run this propagate function on the edge nodes of dropdown zones, and fill in the inside node with 1's
   
   for (let currentNodeX = minNodeX; currentNodeX <= maxNodeX; currentNodeX++) {
      for (let currentNodeY = minNodeY; currentNodeY <= maxNodeY; currentNodeY++) {
         const dist = distance(nodeX, nodeY, currentNodeX, currentNodeY) * LightLevelVars.LIGHT_NODE_SIZE;
         
         const intensity = Math.exp(-dist / 64 / LightLevelVars.DROPDOWN_LIGHT_STRENGTH) * 1;
         
         const node = getLightLevelNode(currentNodeX, currentNodeY);
         const prevIntensity = ambientLightFactors[node];
         if (intensity > prevIntensity) {
            ambientLightFactors[node] = intensity;
         }
      }
   }
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

const generateDepths = (dropdowns: ReadonlyArray<TileIndex>): ReadonlyArray<number> => {
   // To instill some randomness into the depths
   const weightMap = generateOctavePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, 35, 12, 1.75, 0.65);
   
   const depths = new Array<TileIndex>();
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         let distTiles = Number.MAX_SAFE_INTEGER;
         for (const dropdownTileIndex of dropdowns) {
            const dropdownTileX = getTileX(dropdownTileIndex);
            const dropdownTileY = getTileY(dropdownTileIndex);

            const dx = dropdownTileX - tileX;
            const dy = dropdownTileY - tileY;
            const dist = dx * dx + dy + dy;
            if (dist < distTiles) {
               distTiles = dist;
            }
         }
         distTiles = Math.sqrt(distTiles);

         let depth = distTiles / 100;
         
         const weightFactor = Math.log(distTiles) * 0.07;
         const weight = weightMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         depth += weight * weightFactor;
         
         if (depth > 1) {
            depth = 1;
         }

         depths.push(depth);
      }
   }

   return depths;
}

export function generateUndergroundTerrain(surfaceLayer: Layer, undergroundLayer: Layer): void {
   for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
      for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
         if (surfaceLayer.getTileXYType(tileX, tileY) === TileType.dropdown) {
            for (let nodeX = tileX * 4; nodeX < (tileX + 1) * 4; nodeX++) {
               for (let nodeY = tileY * 4; nodeY < (tileY + 1) * 4; nodeY++) {
                  propagateAmbientLightFactor(undergroundLayer.ambientLightFactors, nodeX, nodeY);
               }
            }
         }
      }
   }

   const weightMap = generateOctavePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, 35, 12, 1.75, 0.65);

   const dropdownClosenessArray = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const dropdowns = new Array<TileIndex>();
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tileType = surfaceLayer.tileTypes[tileIndex];
         if (tileType === TileType.dropdown) {
            spreadDropdownCloseness(tileX, tileY, dropdownClosenessArray);
            dropdowns.push(tileIndex);
         }
      }
   }

   const depths = generateDepths(dropdowns);

   const waterGenerationNoise = generatePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, 8);
   const mithrilGenerationNoise = generatePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, 16);
   
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         let weight = weightMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const dropdownCloseness = dropdownClosenessArray[tileIndex];

         weight *= 1 - dropdownCloseness;
         
         undergroundLayer.tileBiomes[tileIndex] = Biome.caves;

         const depth = depths[tileIndex];
         const mithrilGenerationWeight = mithrilGenerationNoise[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];

         let isMithrilRich = false;
         let richnessFactor = 0;
         let weightFactor = 0;
         
         if (weight > 0.57) {
            if (depth > 0.5 && weight < 0.65 && mithrilGenerationWeight > Vars.MIN_MITHRIL_GENERATION_WEIGHT) {
               isMithrilRich = true;
               richnessFactor = (mithrilGenerationWeight - Vars.MIN_MITHRIL_GENERATION_WEIGHT) / (1 - Vars.MIN_MITHRIL_GENERATION_WEIGHT)
               weightFactor = 1 - (weight - 0.57) / (0.65 - 0.57);
            }

            undergroundLayer.tileTypes[tileIndex] = TileType.stoneWallFloor;
            setWallInSubtiles(undergroundLayer.wallSubtileTypes, tileX, tileY, SubtileType.stoneWall);
         } else {
            if (depth > 0.5 && weight > 0.54 && mithrilGenerationWeight > Vars.MIN_MITHRIL_GENERATION_WEIGHT) {
               isMithrilRich = true;
               richnessFactor = (mithrilGenerationWeight - Vars.MIN_MITHRIL_GENERATION_WEIGHT) / (1 - Vars.MIN_MITHRIL_GENERATION_WEIGHT)
               weightFactor = (weight - 0.54) / (0.57 - 0.54);
            }

            let waterGenerationWeight = waterGenerationNoise[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
            // Only generate water at low depths
            waterGenerationWeight *= lerp(0.5, 1, 1 - depth);
            if (weight > 0.44 && weight < 0.51 && waterGenerationWeight > 0.65) {
               undergroundLayer.tileTypes[tileIndex] = TileType.water;
            } else {
               undergroundLayer.tileTypes[tileIndex] = TileType.stone;
            }
         }

         if (isMithrilRich) {
            // Calculate the mithril richness
            let richness = (1 - Math.pow(1 - richnessFactor, 2)) * (1 - Math.pow(1 - weightFactor, 2));
            richness = lerp(0.35, 1, richness);
            undergroundLayer.tileMithrilRichnesses[tileIndex] = richness;
         }
      }
   }

   generateSpikyBastards(undergroundLayer);

   generateMithrilOre(undergroundLayer);

   // Generate tree roots
   const numAttempts = Math.floor(Settings.BOARD_DIMENSIONS * Settings.BOARD_DIMENSIONS * Vars.TREE_ROOT_SPAWN_ATTEMPT_DENSITY);
   for (let i = 0; i < numAttempts; i++) {
      const tileX = Math.floor(Math.random() * Settings.BOARD_DIMENSIONS);
      const tileY = Math.floor(Math.random() * Settings.BOARD_DIMENSIONS);

      // Only generate at low depths
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      const depth = depths[tileIndex];
      if (depth > Math.random() * 0.5 - 0.1) {
         continue;
      }

      // Make sure the tile is a wall tile
      if (!undergroundLayer.subtileIsWall(getSubtileIndex(tileX * 4, tileY * 4))) {
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