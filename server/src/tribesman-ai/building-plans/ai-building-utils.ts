import { Hitbox, updateBox } from "../../../../shared/src/boxes/boxes";
import { createNormalStructureHitboxes } from "../../../../shared/src/boxes/entity-hitbox-creation";
import { hitboxesAreColliding } from "../../../../shared/src/hitbox-collision";
import { Settings } from "../../../../shared/src/settings";
import { StructureType } from "../../../../shared/src/structures";
import { getSubtileX, getSubtileY } from "../../../../shared/src/subtiles";
import { Point, randFloat } from "../../../../shared/src/utils";
import { boxIsCollidingWithSubtile, hitboxArraysAreColliding } from "../../collision";
import { SafetyNode, addHitboxesOccupiedNodes } from "../ai-building";
import TribeBuildingLayer from "./TribeBuildingLayer";

const enum Vars {
   INITIAL_BUILDING_CANDIDATE_GENERATION_RANGE = 700
}

export interface BuildingCandidate {
   readonly buildingLayer: TribeBuildingLayer;
   readonly position: Point;
   readonly rotation: number;
   readonly hitboxes: ReadonlyArray<Hitbox>;
}

const initialBuildingCandidateIsValid = (candidate: BuildingCandidate): boolean => {
   for (const hitbox of candidate.hitboxes) {
      const box = hitbox.box;

      // @Cleanup: side effects! Shouldn't do
      updateBox(box, candidate.position.x, candidate.position.y, candidate.rotation);
      
      // Make sure the hitboxes don't go outside the world
      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();
      if (minX < 0 || maxX >= Settings.BOARD_UNITS || minY < 0 || maxY >= Settings.BOARD_UNITS) {
         return false;
      }
   }
   
   // Make sure the building isn't in any walls
   for (const hitbox of candidate.hitboxes) {
      const box = hitbox.box;

      const minSubtileX = getSubtileX(box.calculateBoundsMinX());
      const maxSubtileX = getSubtileX(box.calculateBoundsMaxX());
      const minSubtileY = getSubtileY(box.calculateBoundsMinY());
      const maxSubtileY = getSubtileY(box.calculateBoundsMaxY());

      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            if (boxIsCollidingWithSubtile(box, subtileX, subtileY)) {
               return false;
            }
         }
      }
   }

   return true;
}

export function buildingCandidateIsValid(buildingLayer: TribeBuildingLayer, candidate: BuildingCandidate): boolean {
   if (!initialBuildingCandidateIsValid(candidate)) {
      return false;
   }
   
   // Make sure that the building is in at least one 'safe' node
   const occupiedNodes = new Set<SafetyNode>();
   addHitboxesOccupiedNodes(candidate.hitboxes, occupiedNodes);
   for (const node of occupiedNodes) {
      if (buildingLayer.safetyNodes.has(node)) {
         return false;
      }
   }
   
   // Make sure the space doesn't collide with any buildings or their restricted building areas
   // @Speed!!
   for (const virtualBuilding of buildingLayer.virtualBuildings) {
      if (hitboxArraysAreColliding(candidate.hitboxes, virtualBuilding.hitboxes)) {
         return false;
      }

      for (const restrictedArea of virtualBuilding.restrictedBuildingAreas) {
         if (hitboxesAreColliding(restrictedArea.hitbox.box, candidate.hitboxes)) {
            return false;
         }
      }
   }

   return true;
}

/** Generates a random valid building location */
export function generateBuildingCandidate(buildingLayer: TribeBuildingLayer, entityType: StructureType): BuildingCandidate {
   let minX: number;
   let maxX: number;
   let minY: number;
   let maxY: number;
   let isInitial: boolean;
   
   // If there are no virtual buildings, we can't use any existing buildings as reference so we go off the start position of the tribe
   if (buildingLayer.virtualBuildings.length === 0) {
      minX = buildingLayer.tribe.startPosition.x - Vars.INITIAL_BUILDING_CANDIDATE_GENERATION_RANGE;
      maxX = buildingLayer.tribe.startPosition.y + Vars.INITIAL_BUILDING_CANDIDATE_GENERATION_RANGE;
      minY = buildingLayer.tribe.startPosition.x - Vars.INITIAL_BUILDING_CANDIDATE_GENERATION_RANGE;
      maxY = buildingLayer.tribe.startPosition.y + Vars.INITIAL_BUILDING_CANDIDATE_GENERATION_RANGE;
      isInitial = true;
   } else {
      // Find min and max node positions
      // @Speed
      let minNodeX = Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1;
      let maxNodeX = 0;
      let minNodeY = Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1;
      let maxNodeY = 0;
      for (const node of buildingLayer.occupiedSafetyNodes) {
         const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
         const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);
   
         if (nodeX < minNodeX) {
            minNodeX = nodeX;
         }
         if (nodeX > maxNodeX) {
            maxNodeX = nodeX;
         }
         if (nodeY < minNodeY) {
            minNodeY = nodeY;
         }
         if (nodeY > maxNodeY) {
            maxNodeY = nodeY;
         }
      }
   
      minX = minNodeX * Settings.SAFETY_NODE_SEPARATION - 150;
      maxX = (maxNodeX + 1) * Settings.SAFETY_NODE_SEPARATION + 150;
      minY = minNodeY * Settings.SAFETY_NODE_SEPARATION - 150;
      maxY = (maxNodeY + 1) * Settings.SAFETY_NODE_SEPARATION + 150;
      isInitial = false;
   }

   let attempts = 0;
   while (attempts++ < 999) {
      const x = randFloat(minX, maxX);
      const y = randFloat(minY, maxY);
      const rotation = 2 * Math.PI * Math.random();
      
      const hitboxes = createNormalStructureHitboxes(entityType);

      const candidate: BuildingCandidate = {
         buildingLayer: buildingLayer,
         position: new Point(x, y),
         rotation: rotation,
         hitboxes: hitboxes
      };

      if ((isInitial && initialBuildingCandidateIsValid(candidate)) ||
          (!isInitial && buildingCandidateIsValid(buildingLayer, candidate))) {
         return candidate;
      }
   }

   throw new Error();
}