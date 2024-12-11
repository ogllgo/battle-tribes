import { PotentialBuildingPlanData } from "battletribes-shared/ai-building-types";
import { EntityType } from "battletribes-shared/entities";
import Tribe from "../Tribe";
import { updateBuildingLayer } from "./ai-building";
import { getTribeSafety } from "./ai-building-heuristics";
import { createVirtualBuilding, VirtualBuilding } from "./building-plans/TribeBuildingLayer";
import { getWallCandidates } from "./building-plans/ai-building-walls";

export function findIdealWallPlacePosition(tribe: Tribe): VirtualBuilding | null {
   const potentialCandidates = getWallCandidates(tribe);
   if (potentialCandidates.length === 0) {
      // Unable to find a position
      return null
   }

   const potentialPlans = new Array<PotentialBuildingPlanData>();

   // 
   // Simulate placing each building to see which one increases safety the most
   // 

   let maxSafety = -1;
   let bestBuilding!: VirtualBuilding;
   for (let i = 0; i < potentialCandidates.length; i++) {
      const candidate = potentialCandidates[i];

      const virtualBuilding = createVirtualBuilding(candidate.buildingLayer, candidate.position, candidate.rotation, EntityType.wall);

      // Simulate placing the wall
      candidate.buildingLayer.addVirtualBuilding(virtualBuilding);
      updateBuildingLayer(candidate.buildingLayer);

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

      // Undo the simulated placement
      candidate.buildingLayer.removeVirtualBuilding(virtualBuilding);
      updateBuildingLayer(candidate.buildingLayer);
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