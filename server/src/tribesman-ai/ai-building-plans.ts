import { PotentialBuildingPlanData } from "battletribes-shared/ai-building-types";
import { EntityType } from "battletribes-shared/entities";
import Tribe from "../Tribe";
import { SafetyNode, updateBuildingLayer } from "./ai-building";
import { getTribeSafety } from "./ai-building-heuristics";
import { TribeRoom } from "./ai-building-areas";
import TribeBuildingLayer, { createVirtualBuilding, VirtualBuilding } from "./building-plans/TribeBuildingLayer";
import { BuildingCandidate } from "./building-plans/ai-building-utils";
import { getWallCandidates } from "./building-plans/ai-building-walls";

interface TribeInfo {
   readonly safetyNodes: Set<SafetyNode>;
   readonly safetyRecord: Record<SafetyNode, number>;
   readonly occupiedSafetyNodes: Set<SafetyNode>;
   readonly virtualBuildings: Array<VirtualBuilding>;
   readonly virtualBuildingRecord: Record<number, VirtualBuilding>;
   readonly areas: Array<TribeRoom>;
   // @Incomplete
   // readonly nodeToAreaIDRecord: Record<SafetyNodeIndex, number>;
}

const copyTribeInfo = (tribe: Tribe, buildingLayer: TribeBuildingLayer): TribeInfo => {
   const safetyRecord: Record<SafetyNode, number> = {};
   const nodes = Object.keys(buildingLayer.safetyRecord).map(nodeString => Number(nodeString)) as Array<SafetyNode>;
   for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      const safety = buildingLayer.safetyRecord[node];
      safetyRecord[node] = safety;
   }

   const virtualBuildingRecord: Record<number, VirtualBuilding> = {};
   const virtualBuildingIDs = Object.keys(tribe.virtualBuildingRecord).map(idString => Number(idString));
   for (let i = 0; i < virtualBuildingIDs.length; i++) {
      const id = virtualBuildingIDs[i];

      const virtualBuilding = tribe.virtualBuildingRecord[id];
      virtualBuildingRecord[id] = virtualBuilding;
   }

   return {
      safetyNodes: new Set(buildingLayer.safetyNodes),
      safetyRecord: safetyRecord,
      occupiedSafetyNodes: new Set(buildingLayer.occupiedSafetyNodes),
      virtualBuildings: tribe.virtualBuildings.slice(),
      virtualBuildingRecord: virtualBuildingRecord,
      areas: buildingLayer.rooms.slice()
   };
}

export function findIdealWallPlacePosition(tribe: Tribe): VirtualBuilding | null {
   const potentialCandidates = getWallCandidates(tribe);
   if (potentialCandidates.length === 0) {
      // Unable to find a position
      return null
   }

   let realTribeInfo!: TribeInfo;

   const potentialPlans = new Array<PotentialBuildingPlanData>();

   // 
   // Simulate placing each building to see which one increases safety the most
   // 

   let maxSafety = -1;
   let bestBuilding!: VirtualBuilding;
   for (let i = 0; i < potentialCandidates.length; i++) {
      const candidate = potentialCandidates[i];

      // Re-copy the tribe info so that it doesn't get modified across iterations
      realTribeInfo = copyTribeInfo(tribe, candidate.buildingLayer);

      // Simulate placing the wall
      const virtualBuilding = createVirtualBuilding(candidate.buildingLayer, candidate.position, candidate.rotation, EntityType.wall);
      candidate.buildingLayer.addVirtualBuilding(virtualBuilding);

      for (const buildingLayer of tribe.buildingLayers) {
         updateBuildingLayer(buildingLayer);
      }

      const query = getTribeSafety(tribe);
      const safety = query.safety;

      if (safety > maxSafety) {
         maxSafety = safety;
         bestBuilding = virtualBuilding;
      }

      potentialPlans.push({
         x: candidate.position.x,
         y: candidate.position.y,
         rotation: candidate.rotation,
         buildingType: EntityType.wall,
         safety: safety,
         safetyData: query.safetyInfo
      });

      // @Incomplete: doesn't reset everything
      // @Cleanup: instead do this by 'undoing' the place?
      // Reset back to real info
      candidate.buildingLayer.safetyNodes = realTribeInfo.safetyNodes;
      candidate.buildingLayer.safetyRecord = realTribeInfo.safetyRecord;
      candidate.buildingLayer.occupiedSafetyNodes = realTribeInfo.occupiedSafetyNodes;
      tribe.virtualBuildings = realTribeInfo.virtualBuildings;
      tribe.virtualBuildingRecord = realTribeInfo.virtualBuildingRecord;
      candidate.buildingLayer.rooms = realTribeInfo.areas;
   }

   return bestBuilding;
}

// @Incomplete
// export function forceBuildPlans(tribe: Tribe): void {
//    for (let i = 0; i < tribe.buildingPlans.length; i++) {
//       const plan = tribe.buildingPlans[i];

//       switch (plan.type) {
//          case BuildingPlanType.newBuilding: {
//             const entityType = (ITEM_INFO_RECORD[plan.buildingRecipe.product] as PlaceableItemInfo).entityType;
//             const connectionInfo = calculateStructureConnectionInfo(plan.position, plan.rotation, entityType, getLayerInfo(plan.layer));

//             placeBuilding(tribe, plan.layer, plan.position, plan.rotation, entityType, connectionInfo, []);
//             break;
//          }
//       }
//    }
// }