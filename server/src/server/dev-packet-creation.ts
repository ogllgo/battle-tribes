import { GameDataPacketOptions } from "../../../shared/src/client-server-types";
import { Packet } from "../../../shared/src/packets";
import { getSubtileSupport, getVisibleSubtileSupports } from "../collapses";
import { getVisiblePathfindingNodeOccupances } from "../pathfinding";
import { addTribeAssignmentData, getTribeAssignmentDataLength, getVisibleSafetyNodesData } from "../tribesman-ai/building-plans/ai-building-client-data";
import { addVirtualBuildingData, getVirtualBuildingDataLength } from "../tribesman-ai/building-plans/TribeBuildingLayer";
import { getTribes } from "../world";
import PlayerClient from "./PlayerClient";

export function getDevPacketDataLength(playerClient: PlayerClient): number {
   const tribes = getTribes();
   
   let lengthBytes = 0;
   
   // Subtile supports
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendSubtileSupports)) {
      // @Speed: called twice
      const visibleSubtileSupports = getVisibleSubtileSupports(playerClient);
      lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * visibleSubtileSupports.length;
   }

   // Pathfinding node occupances
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendVisiblePathfindingNodeOccupances)) {
      // @Speed: called twice
      const visiblePathfindingNodeOccupances = getVisiblePathfindingNodeOccupances(playerClient);
      lengthBytes += Float32Array.BYTES_PER_ELEMENT * visiblePathfindingNodeOccupances.length;
   }

   // AI building safety nodes
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendVisibleSafetyNodes)) {
      // @Speed: called twice
      const visibleSafetyNodes = getVisibleSafetyNodesData(playerClient);
      lengthBytes += visibleSafetyNodes.length * 4 * Float32Array.BYTES_PER_ELEMENT;
   }

   // Tribe assignments and virtual buildings
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (playerClient.isDev) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      for (const tribe of tribes) {
         lengthBytes += Float32Array.BYTES_PER_ELEMENT;

         // Tribe assignments
         lengthBytes += getTribeAssignmentDataLength(tribe);

         // Virtual buildings
         lengthBytes += Float32Array.BYTES_PER_ELEMENT;
         for (const virtualBuilding of tribe.virtualBuildings) {
            lengthBytes += getVirtualBuildingDataLength(virtualBuilding);
         }
      }
   }

   return lengthBytes;
}

export function addDevPacketData(packet: Packet, playerClient: PlayerClient): void {
   const tribes = getTribes();

   // Subtile supports
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendSubtileSupports)) {
      // @Speed: called twice
      const visibleSubtileSupports = getVisibleSubtileSupports(playerClient);

      packet.addNumber(visibleSubtileSupports.length);
      for (const subtileIndex of visibleSubtileSupports) {
         const support = getSubtileSupport(playerClient.lastLayer, subtileIndex);
         
         packet.addNumber(subtileIndex);
         packet.addNumber(support);
      }
   } else {
      packet.addNumber(0);
   }

   // Pathfinding node occupances
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendVisiblePathfindingNodeOccupances)) {
      // @Speed: called twice
      const visiblePathfindingNodeOccupances = getVisiblePathfindingNodeOccupances(playerClient);
      
      packet.addNumber(visiblePathfindingNodeOccupances.length);
      for (const node of visiblePathfindingNodeOccupances) {
         packet.addNumber(node);
      }
   } else {
      packet.addNumber(0);
   }

   // AI building safety nodes
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendVisibleSafetyNodes)) {
      // @Speed: called twice
      const visibleSafetyNodes = getVisibleSafetyNodesData(playerClient);

      packet.addNumber(visibleSafetyNodes.length);
      for (const safetyNodeData of visibleSafetyNodes) {
         packet.addNumber(safetyNodeData.index);
         packet.addNumber(safetyNodeData.safety);
         packet.addBoolean(safetyNodeData.isOccupied);
         packet.padOffset(3);
         packet.addBoolean(safetyNodeData.isContained);
         packet.padOffset(3);
      }
   } else {
      packet.addNumber(0);
   }
   
   // Tribe assignments and virtual buildings
   packet.addNumber(tribes.length);
   for (const tribe of tribes) {
      packet.addNumber(tribe.id);

      // Tribe assignments
      addTribeAssignmentData(packet, tribe);

      // Virtual buildings
      packet.addNumber(tribe.virtualBuildings.length);
      for (const virtualBuilding of tribe.virtualBuildings) {
         addVirtualBuildingData(packet, virtualBuilding);
      }
   }
}