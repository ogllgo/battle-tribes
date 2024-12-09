import { SafetyNodeData, PotentialBuildingPlanData, BuildingPlanData, BuildingSafetyData, PotentialPlanSafetyData, WallSideNodeData, TribeWallData, WallConnectionData } from "battletribes-shared/ai-building-types";
import { VisibleChunkBounds, RestrictedBuildingAreaData } from "battletribes-shared/client-server-types";
import { EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, TribesmanPlanType } from "battletribes-shared/utils";
import Layer from "../../Layer";
import Tribe from "../../Tribe";
import { SafetyNode, getSafetyNode } from "../ai-building";
import { buildingIsInfrastructure, getBuildingSafety } from "../ai-building-heuristics";
import { TribeComponentArray } from "../../components/TribeComponent";
import { TransformComponentArray } from "../../components/TransformComponent";
import { VirtualWall } from "./TribeBuildingLayer";
import { CraftRecipePlan, GatherItemPlan, PlaceBuildingPlan, TechCompletePlan, TechItemPlan, TechStudyPlan, TribesmanPlan, UpgradeBuildingPlan } from "../tribesman-ai-planning";
import { Packet } from "../../../../shared/src/packets";
import { CRAFTING_RECIPES } from "../../../../shared/src/items/crafting-recipes";

// @Cleanup: should this be here?
export function getVisibleTribes(playerLayer: Layer, chunkBounds: VisibleChunkBounds): ReadonlyArray<Tribe> {
   // Calculate visible tribes
   const visibleTribes = new Array<Tribe>();
   for (let chunkX = chunkBounds[0]; chunkX <= chunkBounds[1]; chunkX++) {
      for (let chunkY = chunkBounds[2]; chunkY <= chunkBounds[3]; chunkY++) {
         const chunk = playerLayer.getChunk(chunkX, chunkY);
         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (TribeComponentArray.hasComponent(entity)) {
               const tribeComponent = TribeComponentArray.getComponent(entity);
               if (visibleTribes.indexOf(tribeComponent.tribe) === -1) {
                  visibleTribes.push(tribeComponent.tribe);
               }
            }
         }
      }
   }
   return visibleTribes;
}

export function getVisibleSafetyNodesData(playerLayer: Layer, visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<SafetyNodeData> {
   const safetyNodesData = new Array<SafetyNodeData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];
      const buildingLayer = tribe.buildingLayers[playerLayer.depth];

      const minNodeX = Math.floor(chunkBounds[0] * Settings.CHUNK_UNITS / Settings.SAFETY_NODE_SEPARATION);
      const maxNodeX = Math.floor((chunkBounds[1] + 1) * Settings.CHUNK_UNITS / Settings.SAFETY_NODE_SEPARATION) - 1;
      const minNodeY = Math.floor(chunkBounds[2] * Settings.CHUNK_UNITS / Settings.SAFETY_NODE_SEPARATION);
      const maxNodeY = Math.floor((chunkBounds[3] + 1) * Settings.CHUNK_UNITS / Settings.SAFETY_NODE_SEPARATION) - 1;
      for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
         for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
            const nodeIndex = getSafetyNode(nodeX, nodeY);

            const safety = buildingLayer.safetyRecord[nodeIndex];
            if (safety === undefined) {
               continue;
            }

            // Check if the node is contained
            let isContained = false;
            for (let i = 0; i < buildingLayer.rooms.length; i++) {
               const area = buildingLayer.rooms[i];
               if (area.containedNodes.has(nodeIndex)) {
                  isContained = true;
                  break;
               }
            }
            
            safetyNodesData.push({
               index: nodeIndex,
               safety: safety,
               isOccupied: buildingLayer.occupiedSafetyNodes.has(nodeIndex),
               isContained: isContained
            });
         }
      }
   }

   return safetyNodesData;
}

const getTribePotentialBuildingPlans = (plan: TribesmanPlan, chunkBounds: VisibleChunkBounds): ReadonlyArray<PotentialBuildingPlanData> => {
   const potentialPlansData = new Array<PotentialBuildingPlanData>();
   for (let i = 0; i < plan.potentialPlans.length; i++) {
      const potentialPlanData = plan.potentialPlans[i];
   
      // @Incomplete: filter out potential plans which aren't visible
      
      potentialPlansData.push(potentialPlanData);
   }

   return potentialPlansData;
}

const addPlansRecursively = (plan: TribesmanPlan, chunkBounds: VisibleChunkBounds, buildingPlansData: Array<BuildingPlanData>): void => {
   let planPosition: Point;
   let planRotation: number;
   let entityType: EntityType;
   switch (plan.type) {
      case TribesmanPlanType.placeBuilding: {               
         planPosition = plan.virtualBuilding.position;
         planRotation = plan.virtualBuilding.rotation;
         entityType = plan.virtualBuilding.entityType;
         break;
      }
      case TribesmanPlanType.upgradeBuilding: {
         const building = plan.baseBuildingID;
         
         const buildingTransformComponent = TransformComponentArray.getComponent(building);
         
         planPosition = buildingTransformComponent.position;
         planRotation = plan.rotation;
         entityType = plan.entityType;
         break;
      }
      default: {
         return;
      }
   }
   
   // @Cleanup: hardcoded
   const minChunkX = Math.max(Math.floor((planPosition.x - 800) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((planPosition.x + 800) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((planPosition.y - 800) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((planPosition.y + 800) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   if (minChunkX <= chunkBounds[1] && maxChunkX >= chunkBounds[0] && minChunkY <= chunkBounds[3] && maxChunkY >= chunkBounds[2]) {
      buildingPlansData.push({
         x: planPosition.x,
         y: planPosition.y,
         rotation: planRotation,
         entityType: entityType,
         potentialBuildingPlans: getTribePotentialBuildingPlans(plan, chunkBounds),
         assignedTribesmanID: plan.assignedTribesman || -1
      });
   }

   for (const childPlan of plan.childPlans) {
      addPlansRecursively(childPlan, chunkBounds, buildingPlansData);
   }
}

export function getVisibleBuildingPlans(visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<BuildingPlanData> {
   const buildingPlansData = new Array<BuildingPlanData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];

      addPlansRecursively(tribe.rootPlan, chunkBounds, buildingPlansData);
   }

   return buildingPlansData;
}

export function getVisibleBuildingSafetys(visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<BuildingSafetyData> {
   const buildingSafetysData = new Array<BuildingSafetyData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];

      for (let i = 0; i < tribe.buildings.length; i++) {
         const building = tribe.buildings[i];
         if (!buildingIsInfrastructure(building)) {
            continue;
         }
         // @Incomplete: filter out nodes which aren't in the chunk bounds

         // @Speed: Garbage collection
         const safetyInfo: PotentialPlanSafetyData = {
            buildingTypes: [],
            buildingIDs: [],
            buildingMinSafetys: [],
            buildingAverageSafetys: [],
            buildingExtendedAverageSafetys: [],
            buildingResultingSafetys: []
         };
         getBuildingSafety(tribe, building, safetyInfo);

         const buildingTransformComponent = TransformComponentArray.getComponent(building);

         buildingSafetysData.push({
            x: buildingTransformComponent.position.x,
            y: buildingTransformComponent.position.y,
            minSafety: safetyInfo.buildingMinSafetys[0],
            averageSafety: safetyInfo.buildingAverageSafetys[0],
            extendedAverageSafety: safetyInfo.buildingExtendedAverageSafetys[0],
            resultingSafety: safetyInfo.buildingResultingSafetys[0],
         });
      }
   }

   return buildingSafetysData;
}

export function getVisibleRestrictedBuildingAreas(visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<RestrictedBuildingAreaData> {
   const restrictedAreasData = new Array<RestrictedBuildingAreaData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];

      for (const virtualBuilding of tribe.virtualBuildings) {
         for (const restrictedArea of virtualBuilding.restrictedBuildingAreas) {
            // @Incomplete: filter out areas which aren't in the chunk bounds
   
            restrictedAreasData.push({
               x: restrictedArea.position.x,
               y: restrictedArea.position.y,
               rotation: restrictedArea.rotation,
               width: restrictedArea.width,
               height: restrictedArea.height
            });
         }
      }
   }

   return restrictedAreasData;
}

const getWallSideNodeData = (nodeIndex: SafetyNode, side: number): WallSideNodeData => {
   return {
      nodeIndex: nodeIndex,
      side: side
   };
}

export function getVisibleWallsData(playerLayer: Layer, visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<TribeWallData> {
   const wallDataArray = new Array<TribeWallData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];
      const buildingLayer = tribe.buildingLayers[playerLayer.depth];

      // @Incomplete: filter out areas which aren't in the chunk bounds
      // @Hack: cast
      for (const wall of buildingLayer.virtualBuildingsByEntityType[EntityType.wall] as Array<VirtualWall>) {
         const topSideNodes = wall.topSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 0));
         const rightSideNodes = wall.rightSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 1));
         const bottomSideNodes = wall.bottomSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 2));
         const leftSideNodes = wall.leftSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 3));

         wallDataArray.push({
            wallID: wall.id,
            topSideNodes: topSideNodes,
            rightSideNodes: rightSideNodes,
            bottomSideNodes: bottomSideNodes,
            leftSideNodes: leftSideNodes
         });
      }
   }

   return wallDataArray;
}

export function getVisibleWallConnections(playerLayer: Layer, visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<WallConnectionData> {
   const connectionsData = new Array<WallConnectionData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];
      const buildingLayer = tribe.buildingLayers[playerLayer.depth];

      // @Hack: cast
      for (const wall of buildingLayer.virtualBuildingsByEntityType[EntityType.wall] as Array<VirtualWall>) {
         // @Incomplete: filter out nodes which aren't in the chunk bounds

         if (wall.connectionBitset & 0b0001) {
            connectionsData.push({
               x: wall.position.x + 24 * Math.sin(wall.rotation),
               y: wall.position.y + 24 * Math.cos(wall.rotation),
               rotation: wall.rotation
            });
         }
         if (wall.connectionBitset & 0b0010) {
            connectionsData.push({
               x: wall.position.x + 24 * Math.sin(wall.rotation + Math.PI/2),
               y: wall.position.y + 24 * Math.cos(wall.rotation + Math.PI/2),
               rotation: wall.rotation + Math.PI/2
            });
         }
         if (wall.connectionBitset & 0b0100) {
            connectionsData.push({
               x: wall.position.x + 24 * Math.sin(wall.rotation + Math.PI),
               y: wall.position.y + 24 * Math.cos(wall.rotation + Math.PI),
               rotation: wall.rotation + Math.PI
            });
         }
         if (wall.connectionBitset & 0b1000) {
            connectionsData.push({
               x: wall.position.x + 24 * Math.sin(wall.rotation + Math.PI*3/2),
               y: wall.position.y + 24 * Math.cos(wall.rotation + Math.PI*3/2),
               rotation: wall.rotation + Math.PI*3/2
            });
         }
      }
   }

   return connectionsData;
}

const addBasePlanData = (packet: Packet, plan: TribesmanPlan): void => {
   packet.addNumber(plan.type);
   packet.addNumber(plan.assignedTribesman !== null ? plan.assignedTribesman : 0);
   packet.addBoolean(plan.isComplete);
   packet.padOffset(3);
}
const getBasePlanDataLength = (): number => {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

const addCraftRecipePlanData = (packet: Packet, plan: CraftRecipePlan): void => {
   // @Speed
   packet.addNumber(CRAFTING_RECIPES.indexOf(plan.recipe));
   packet.addNumber(plan.productAmount);
}
const getCraftRecipePlanDataLength = (): number => {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

const addPlaceBuildingPlanData = (packet: Packet, plan: PlaceBuildingPlan): void => {
   packet.addNumber(plan.virtualBuilding.entityType);
}
const getPlaceBuildingPlanDataLength = (): number => {
   return 1 * Float32Array.BYTES_PER_ELEMENT;
}

const addUpgradeBuildingPlanData = (packet: Packet, plan: UpgradeBuildingPlan): void => {
   packet.addNumber(plan.blueprintType);
}
const getUpgradeBuildingPlanDataLength = (): number => {
   return 1 * Float32Array.BYTES_PER_ELEMENT;
}

const addTechStudyPlanData = (packet: Packet, plan: TechStudyPlan): void => {
   packet.addNumber(plan.tech.id);
}
const getTechStudyPlanDataLength = (): number => {
   return 1 * Float32Array.BYTES_PER_ELEMENT;
}

const addTechItemPlanData = (packet: Packet, plan: TechItemPlan): void => {
   packet.addNumber(plan.tech.id);
   packet.addNumber(plan.itemType);
}
const getTechItemPlanDataLength = (): number => {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

const addTechCompletePlanData = (packet: Packet, plan: TechCompletePlan): void => {
   packet.addNumber(plan.tech.id);
}
const getTechCompletePlanDataLength = (): number => {
   return 1 * Float32Array.BYTES_PER_ELEMENT;
}

const addGatherItemPlanData = (packet: Packet, plan: GatherItemPlan): void => {
   packet.addNumber(plan.itemType);
   packet.addNumber(plan.amount);
}
const getGatherItemPlanDataLength = (): number => {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

export function addPlanData(packet: Packet, plan: TribesmanPlan): void {
   // Add data for the plan
   addBasePlanData(packet, plan);
   switch (plan.type) {
      case TribesmanPlanType.craftRecipe:     addCraftRecipePlanData(packet, plan); break;
      case TribesmanPlanType.placeBuilding:   addPlaceBuildingPlanData(packet, plan); break;
      case TribesmanPlanType.upgradeBuilding: addUpgradeBuildingPlanData(packet, plan); break;
      case TribesmanPlanType.doTechStudy:     addTechStudyPlanData(packet, plan); break;
      case TribesmanPlanType.doTechItems:     addTechItemPlanData(packet, plan); break;
      case TribesmanPlanType.completeTech:    addTechCompletePlanData(packet, plan); break;
      case TribesmanPlanType.gatherItem:      addGatherItemPlanData(packet, plan); break;
   }

   packet.addNumber(plan.childPlans.length);
   for (const childPlan of plan.childPlans) {
      addPlanData(packet, childPlan);
   }
}

export function getTribePlansDataLength(plan: TribesmanPlan): number {
   let dataLength = getBasePlanDataLength();
   switch (plan.type) {
      case TribesmanPlanType.craftRecipe:     dataLength += getCraftRecipePlanDataLength(); break;
      case TribesmanPlanType.placeBuilding:   dataLength += getPlaceBuildingPlanDataLength(); break;
      case TribesmanPlanType.upgradeBuilding: dataLength += getUpgradeBuildingPlanDataLength(); break;
      case TribesmanPlanType.doTechStudy:     dataLength += getTechStudyPlanDataLength(); break;
      case TribesmanPlanType.doTechItems:     dataLength += getTechItemPlanDataLength(); break;
      case TribesmanPlanType.completeTech:    dataLength += getTechCompletePlanDataLength(); break;
      case TribesmanPlanType.gatherItem:      dataLength += getGatherItemPlanDataLength(); break;
   }
   
   dataLength += Float32Array.BYTES_PER_ELEMENT;
   for (const childPlan of plan.childPlans) {
      dataLength += getTribePlansDataLength(childPlan);
   }

   return dataLength;
}