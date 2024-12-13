import { updateBox } from "../../../../shared/src/boxes/boxes";
import { createNormalStructureHitboxes } from "../../../../shared/src/boxes/entity-hitbox-creation";
import { EntityType } from "../../../../shared/src/entities";
import { Settings } from "../../../../shared/src/settings";
import { getAngleDiff, Point, TileIndex } from "../../../../shared/src/utils";
import Tribe from "../../Tribe";
import { SafetyNode } from "../ai-building";
import TribeBuildingLayer from "./TribeBuildingLayer";
import { BuildingCandidate, buildingCandidateIsValid } from "./ai-building-utils";

/*
This file is responsible for finding all potential wall candidates.
*/

const wallCandidateAlreadyExists = (candidate: BuildingCandidate, placeCandidates: ReadonlyArray<BuildingCandidate>): boolean => {
   for (let i = 0; i < placeCandidates.length; i++) {
      const currentCandidate = placeCandidates[i];
      if (candidate.buildingLayer !== currentCandidate.buildingLayer) {
         continue;
      }

      const diffX = candidate.position.x - currentCandidate.position.x;
      const diffY = candidate.position.y - currentCandidate.position.y;
      const diffRotation = getAngleDiff(candidate.rotation, currentCandidate.rotation);
      if (Math.abs(diffX) < 0.1 && Math.abs(diffY) < 0.1 && Math.abs(diffRotation) < 0.0001) {
         return true;
      }
   }

   return false;
}

const convertSafetyNodeToTileIndex = (node: SafetyNode): TileIndex => {
   const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
   const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

   const tileX = Math.floor(nodeX * Settings.SAFETY_NODE_SEPARATION / Settings.TILE_SIZE);
   const tileY = Math.floor(nodeY * Settings.SAFETY_NODE_SEPARATION / Settings.TILE_SIZE);

   // @Cleanup: might want to instead use the full world?
   const tileIndex = tileY * Settings.TILES_IN_WORLD_WIDTH + tileX;
   return tileIndex;
}

const addGridAlignedWallCandidates = (buildingLayer: TribeBuildingLayer, placeCandidates: Array<BuildingCandidate>): void => {
   const tileIndexes = new Set<number>();

   // First, we mark which tiles are occupied by buildings or restricted building areas
   for (const virtualBuilding of buildingLayer.virtualBuildings) {
      for (const node of virtualBuilding.occupiedNodes) {
         const tileIndex = convertSafetyNodeToTileIndex(node);
         tileIndexes.add(tileIndex);
      }
   
      for (const restrictedArea of virtualBuilding.restrictedBuildingAreas) {
         for (const node of restrictedArea.occupiedNodes) {
            const tileIndex = convertSafetyNodeToTileIndex(node);
            tileIndexes.add(tileIndex);
         }
      }
   }

   // Expand tile indexes
   // @Speed
   for (let i = 0; i < 2; i++) {
      const tileIndexesToAdd = new Set<SafetyNode>();
      
      for (const tileIndex of tileIndexes) {
         const tileX = tileIndex % Settings.TILES_IN_WORLD_WIDTH;
         const tileY = Math.floor(tileIndex / Settings.TILES_IN_WORLD_WIDTH);

         // Top
         if (tileY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
            const tileIndex = (tileY + 1) * Settings.TILES_IN_WORLD_WIDTH + tileX;
            tileIndexesToAdd.add(tileIndex);
         }
   
         // Right
         if (tileX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
            const tileIndex = tileY * Settings.TILES_IN_WORLD_WIDTH + tileX + 1;
            tileIndexesToAdd.add(tileIndex);
         }
   
         // Bottom
         if (tileY > 0) {
            const tileIndex = (tileY - 1) * Settings.TILES_IN_WORLD_WIDTH + tileX;
            tileIndexesToAdd.add(tileIndex);
         }
   
         // Left
         if (tileX > 0) {
            const tileIndex = tileY * Settings.TILES_IN_WORLD_WIDTH + tileX - 1;
            tileIndexesToAdd.add(tileIndex);
         }
      }

      for (const tileIndex of tileIndexesToAdd) {
         tileIndexes.add(tileIndex);
      }
   }

   // Filter candidates
   for (const tileIndex of tileIndexes) {
      const tileX = tileIndex % Settings.TILES_IN_WORLD_WIDTH;
      const tileY = Math.floor(tileIndex / Settings.TILES_IN_WORLD_WIDTH);

      const x = (tileX + 0.5) * Settings.TILE_SIZE;
      const y = (tileY + 0.5) * Settings.TILE_SIZE;

      const hitboxes = createNormalStructureHitboxes(EntityType.wall);
      // @Copynpaste
      for (const hitbox of hitboxes) {
         updateBox(hitbox.box, x, y, 0);
      }
      
      const candidate: BuildingCandidate = {
         buildingLayer: buildingLayer,
         position: new Point(x, y),
         rotation: 0,
         hitboxes: hitboxes
      };
      
      if (buildingCandidateIsValid(buildingLayer, candidate) && !wallCandidateAlreadyExists(candidate, placeCandidates)) {
         placeCandidates.push(candidate);
      }
   }
}

/** Adds the walls off from existing walls */
const addSnappedWallCandidates = (buildingLayer: TribeBuildingLayer, placeCandidates: Array<BuildingCandidate>): void => {
   for (let i = 0; i < buildingLayer.virtualBuildings.length; i++) {
      const virtualBuilding = buildingLayer.virtualBuildings[i];
      if (virtualBuilding.entityType !== EntityType.wall) {
         continue;
      }
      
      for (let i = 0; i < 4; i++) {
         const offsetDirection = virtualBuilding.rotation + i * Math.PI / 2;
         const x = virtualBuilding.position.x + 64 * Math.sin(offsetDirection);
         const y = virtualBuilding.position.y + 64 * Math.cos(offsetDirection);

         const hitboxes = createNormalStructureHitboxes(EntityType.wall);
         // @Copynpaste
         for (const hitbox of hitboxes) {
            updateBox(hitbox.box, x, y, virtualBuilding.rotation);
         }
         
         const candidate: BuildingCandidate = {
            buildingLayer: buildingLayer,
            position: new Point(x, y),
            rotation: virtualBuilding.rotation,
            hitboxes: hitboxes
         };

         if (buildingCandidateIsValid(buildingLayer, candidate) && !wallCandidateAlreadyExists(candidate, placeCandidates)) {
            placeCandidates.push(candidate);
         }
      }
   }
}

export function getWallCandidates(tribe: Tribe): ReadonlyArray<BuildingCandidate> {
   const candidates = new Array<BuildingCandidate>();

   for (const buildingLayer of tribe.buildingLayers) {
      addGridAlignedWallCandidates(buildingLayer, candidates);
      addSnappedWallCandidates(buildingLayer, candidates);
   }
   
   return candidates;
}