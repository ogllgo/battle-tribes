import { SafetyNodeData } from "../../../shared/src/ai-building-types";
import { PathfindingNodeIndex } from "../../../shared/src/client-server-types";
import { PacketReader } from "../../../shared/src/packets";
import { assert } from "../../../shared/src/utils";
import { readTribeBuildingSafeties, resetBuildingSafeties } from "../building-safety";
import { updateLightLevelsFromData } from "../light-levels";
import { readLocalBiomes } from "../local-biomes";
import { updateTribePlanData } from "../rendering/tribe-plan-visualiser/tribe-plan-visualiser";
import { setVisiblePathfindingNodeOccupances } from "../rendering/webgl/pathfinding-node-rendering";
import { setVisibleSafetyNodes } from "../rendering/webgl/safety-node-rendering";
import { SubtileSupportInfo, setVisibleSubtileSupports } from "../rendering/webgl/subtile-support-rendering";
import { setChunkWeights } from "../text-canvas";
import { readGhostVirtualBuildings, pruneGhostBuildingPlans } from "../virtual-buildings";

export function readPacketDevData(reader: PacketReader): void {
   // Subtile supports
   const numSubtiles = reader.readNumber();
   if (numSubtiles > 0) {
      const subtileSupports = new Array<SubtileSupportInfo>();
      
      for (let i = 0; i < numSubtiles; i++) {
         const subtileIndex = reader.readNumber();
         const support = reader.readNumber();

         subtileSupports.push({
            subtileIndex: subtileIndex,
            support: support
         });
      }

      setVisibleSubtileSupports(subtileSupports);
   }

   // Pathfinding node occupances
   const numPathfindingNodes = reader.readNumber();
   if (numPathfindingNodes > 0) {
      const visiblePathfindingNodeOccupances = new Array<PathfindingNodeIndex>();
      
      for (let i = 0; i < numPathfindingNodes; i++) {
         const node = reader.readNumber();
         visiblePathfindingNodeOccupances.push(node);
      }

      setVisiblePathfindingNodeOccupances(visiblePathfindingNodeOccupances);
   }

   // AI building safety nodes
   const numVisibleSafetyNodes = reader.readNumber();
   if (numVisibleSafetyNodes > 0) {
      const visibleSafetyNodes = new Array<SafetyNodeData>();

      for (let i = 0; i < numVisibleSafetyNodes; i++) {
         const index = reader.readNumber();
         const safety = reader.readNumber();
         const isOccupied = reader.readBoolean();
         reader.padOffset(3);
         const isContained = reader.readBoolean();
         reader.padOffset(3);

         const safetyNodeData: SafetyNodeData = {
            index: index,
            safety: safety,
            isOccupied: isOccupied,
            isContained: isContained
         };
         visibleSafetyNodes.push(safetyNodeData);
      }

      setVisibleSafetyNodes(visibleSafetyNodes);
   }

   updateLightLevelsFromData(reader);
   
   resetBuildingSafeties();
   
   const numTribes = reader.readNumber();
   assert(Number.isInteger(numTribes));
   for (let i = 0; i < numTribes; i++) {
      const tribeID = reader.readNumber();

      // Tribe plans
      updateTribePlanData(reader, tribeID);

      // Virtual buildings
      readGhostVirtualBuildings(reader);

      // Building safeties
      readTribeBuildingSafeties(reader);
   }

   pruneGhostBuildingPlans();

   readLocalBiomes(reader);

   const hasSpawnDistribution = reader.readBoolean();
   reader.padOffset(3);
   if (hasSpawnDistribution) {
      const chunkWeights = new Map<number, number>();
      
      const numChunks = reader.readNumber();
      for (let i = 0; i < numChunks; i++) {
         const chunkIndex = reader.readNumber();
         const weight = reader.readNumber();
         chunkWeights.set(chunkIndex, weight);
      }

      setChunkWeights(chunkWeights);
   } else {
      setChunkWeights(new Map());
   }
}