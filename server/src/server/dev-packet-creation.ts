import { GameDataPacketOptions } from "../../../shared/src/client-server-types";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { AIPlanType, getTileIndexIncludingEdges, TileIndex } from "../../../shared/src/utils";
import { getSubtileSupport, getVisibleSubtileSupports } from "../collapses";
import { EntitySpawnInfo, getSpawnInfoForEntityType, SpawnDistribution } from "../entity-spawn-info";
import { addPlayerLightLevelsData, getPlayerLightLevelsDataLength } from "../light-levels";
import { getVisiblePathfindingNodeOccupances } from "../pathfinding";
import { addTribeAssignmentData, addTribeBuildingSafetyData, getTribeAssignmentDataLength, getTribeBuildingSafetyDataLength, getVisibleSafetyNodesData } from "../tribesman-ai/building-plans/ai-building-client-data";
import { addVirtualBuildingData, getVirtualBuildingDataLength } from "../tribesman-ai/building-plans/TribeBuildingLayer";
import { AIPlanAssignment } from "../tribesman-ai/tribesman-ai-planning";
import { getEntitySpawnTicks, getTribes } from "../world";
import { LocalBiome } from "../world-generation/terrain-generation-utils";
import PlayerClient from "./PlayerClient";

interface VisibleLocalBiomeInfo {
   readonly visibleLocalBiomes: ReadonlyArray<LocalBiome>;
   readonly tileToLocalBiomeMap: Map<TileIndex, LocalBiome>;
}

const createTileToLocalBiomeMap = (playerClient: PlayerClient, localBiome: LocalBiome): Map<TileIndex, LocalBiome> => {
   const tileToLocalBiomeMap = new Map<TileIndex, LocalBiome>();
   
   let minTileX = Math.floor(playerClient.minVisibleX / Settings.TILE_SIZE);
   if (localBiome.minTileX > minTileX) {
      minTileX = localBiome.minTileX;
   }
   let maxTileX = Math.floor(playerClient.maxVisibleX / Settings.TILE_SIZE);
   if (localBiome.maxTileX < maxTileX) {
      maxTileX = localBiome.maxTileX;
   }
   let minTileY = Math.floor(playerClient.minVisibleY / Settings.TILE_SIZE);
   if (localBiome.minTileY > minTileY) {
      minTileY = localBiome.minTileY;
   }
   let maxTileY = Math.floor(playerClient.maxVisibleY / Settings.TILE_SIZE);
   if (localBiome.maxTileY < maxTileY) {
      maxTileY = localBiome.maxTileY;
   }
   for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const localBiome = playerClient.lastLayer.getTileLocalBiome(tileIndex);

         tileToLocalBiomeMap.set(tileIndex, localBiome);
      }
   }

   return tileToLocalBiomeMap;
}

const getVisibleLocalBiomeInfo = (playerClient: PlayerClient): VisibleLocalBiomeInfo => {
   const localBiomes = new Array<LocalBiome>();
   const tileToLocalBiomeMap = new Map<TileIndex, LocalBiome>();
   
   const minTileX = Math.floor(playerClient.minVisibleX / Settings.TILE_SIZE);
   const maxTileX = Math.floor(playerClient.maxVisibleX / Settings.TILE_SIZE);
   const minTileY = Math.floor(playerClient.minVisibleY / Settings.TILE_SIZE);
   const maxTileY = Math.floor(playerClient.maxVisibleY / Settings.TILE_SIZE);
   for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const localBiome = playerClient.lastLayer.getTileLocalBiome(tileIndex);

         if (localBiomes.indexOf(localBiome) === -1) {
            localBiomes.push(localBiome);
         }
      }
   }

   return {
      visibleLocalBiomes: localBiomes,
      tileToLocalBiomeMap: tileToLocalBiomeMap
   };
}

const getLocalBiomeDataLength = (playerClient: PlayerClient, localBiome: LocalBiome): number => {
   const tileToLocalBiomeMap = createTileToLocalBiomeMap(playerClient, localBiome);
   
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   
   let numTiles = 0;
   for (const pair of tileToLocalBiomeMap) {
      if (pair[1] === localBiome) {
         numTiles++;
      }
   }
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * numTiles;

   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT * localBiome.entityCensus.size;
   return lengthBytes;
}

const addLocalBiomeDataToPacket = (packet: Packet, playerClient: PlayerClient, localBiome: LocalBiome): void => {
   const tileToLocalBiomeMap = createTileToLocalBiomeMap(playerClient, localBiome);

   packet.addNumber(localBiome.id);

   let numTiles = 0;
   for (const pair of tileToLocalBiomeMap) {
      if (pair[1] === localBiome) {
         numTiles++;
      }
   }
   packet.addNumber(numTiles);
   for (const pair of tileToLocalBiomeMap) {
      if (pair[1] === localBiome) {
         packet.addNumber(pair[0]);
      }
   }

   packet.addNumber(localBiome.entityCensus.size);
   for (const pair of localBiome.entityCensus) {
      const entityType = pair[0];
      const count = pair[1];

      packet.addNumber(entityType);
      packet.addNumber(count);

      const spawnInfo = getSpawnInfoForEntityType(entityType);
      if (spawnInfo !== null) {
         let numEligibleTiles = 0;
         for (const tileType of spawnInfo.spawnableTileTypes) {
            numEligibleTiles += localBiome.tileCensus[tileType] || 0;
         }
   
         const density = count / numEligibleTiles;
         packet.addNumber(density);
   
         packet.addNumber(spawnInfo.maxDensity);
      } else {
         packet.addNumber(0);
         packet.addNumber(0);
      }
   }
}

const getVirtualBuildingGhostEntitiesLength = (assignment: AIPlanAssignment): number => {
   let lengthBytes = 0;
   if (assignment.plan.type === AIPlanType.placeBuilding) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      
      lengthBytes += getVirtualBuildingDataLength(assignment.plan.virtualBuilding);

      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      for (const potentialPlan of assignment.plan.potentialPlans) {
         lengthBytes += getVirtualBuildingDataLength(potentialPlan.virtualBuilding);
         lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      }
   }

   for (const childAssignment of assignment.children) {
      lengthBytes += getVirtualBuildingGhostEntitiesLength(childAssignment);
   }

   return lengthBytes;
}

const addVirtualBuildingGhostEntities = (packet: Packet, assignment: AIPlanAssignment): void => {
   if (assignment.plan.type === AIPlanType.placeBuilding) {
      packet.addBoolean(true);
      packet.padOffset(3);
      
      const plan = assignment.plan;
      addVirtualBuildingData(packet, plan.virtualBuilding);

      // Add any potential plans
      packet.addNumber(plan.potentialPlans.length);
      for (const potentialPlan of plan.potentialPlans) {
         addVirtualBuildingData(packet, potentialPlan.virtualBuilding);
         packet.addNumber(potentialPlan.safety);
      }
   }

   for (const childAssignment of assignment.children) {
      addVirtualBuildingGhostEntities(packet, childAssignment);
   }
}

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

   // Light levels
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendLightLevels)) {
      lengthBytes += getPlayerLightLevelsDataLength(playerClient);
   } else {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
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
         lengthBytes += getVirtualBuildingGhostEntitiesLength(tribe.rootAssignment);
         lengthBytes += Float32Array.BYTES_PER_ELEMENT;

         // Building safeties
         lengthBytes += getTribeBuildingSafetyDataLength(playerClient);
      }
   }

   // Local biomes
   const info = getVisibleLocalBiomeInfo(playerClient);
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const localBiome of info.visibleLocalBiomes) {
      lengthBytes += getLocalBiomeDataLength(playerClient, localBiome);
   }
   
   const spawnInfo = getSpawnInfoForEntityType(playerClient.viewedSpawnDistribution);
   const distribution = spawnInfo?.spawnDistribution;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (typeof distribution !== "undefined") {
      lengthBytes += getViewedSpawnDistributionDataLength(playerClient);
   }

   return lengthBytes;
}

const getViewedSpawnDistributionDataLength = (playerClient: PlayerClient): number => {
   const numVisibleChunks = (playerClient.maxVisibleChunkX + 1 - playerClient.minVisibleChunkX) * (playerClient.maxVisibleChunkY + 1 - playerClient.minVisibleChunkY);

   return Float32Array.BYTES_PER_ELEMENT + 2 * Float32Array.BYTES_PER_ELEMENT * numVisibleChunks;
}

const addViewedSpawnDistributionData = (packet: Packet, playerClient: PlayerClient, distribution: SpawnDistribution): void => {
   packet.addNumber((playerClient.maxVisibleChunkX + 1 - playerClient.minVisibleChunkX) * (playerClient.maxVisibleChunkY + 1 - playerClient.minVisibleChunkY));
   for (let chunkX = playerClient.minVisibleChunkX; chunkX <= playerClient.maxVisibleChunkX; chunkX++) {
      for (let chunkY = playerClient.minVisibleChunkY; chunkY <= playerClient.maxVisibleChunkY; chunkY++) {
         const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
         const weight = distribution.weights[chunkIndex];

         packet.addNumber(chunkIndex);
         packet.addNumber(weight);
      }
   }
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

   // Light levels
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendLightLevels)) {
      addPlayerLightLevelsData(packet, playerClient)
   } else {
      packet.addNumber(0);
   }
   
   packet.addNumber(tribes.length);
   for (const tribe of tribes) {
      packet.addNumber(tribe.id);

      // Tribe assignments
      addTribeAssignmentData(packet, tribe);

      // Virtual buildings
      addVirtualBuildingGhostEntities(packet, tribe.rootAssignment);
      packet.addBoolean(false);
      packet.padOffset(3)

      // Building safetys
      addTribeBuildingSafetyData(packet, playerClient);
   }

   // Local biomes
   const info = getVisibleLocalBiomeInfo(playerClient);
   packet.addNumber(info.visibleLocalBiomes.length);
   for (const localBiome of info.visibleLocalBiomes) {
      addLocalBiomeDataToPacket(packet, playerClient, localBiome);
   }

   const spawnInfo = getSpawnInfoForEntityType(playerClient.viewedSpawnDistribution);
   const distribution = spawnInfo?.spawnDistribution;
   packet.addBoolean(typeof distribution !== "undefined");
   packet.padOffset(3);
   if (typeof distribution !== "undefined") {
      addViewedSpawnDistributionData(packet, playerClient, distribution);
   }
}
