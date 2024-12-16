import { VisibleChunkBounds } from "battletribes-shared/client-server-types";
import { ServerComponentType, ServerComponentTypeString } from "battletribes-shared/components";
import { Entity, EntityTypeString } from "battletribes-shared/entities";
import Layer from "../Layer";
import { ComponentArrays } from "../components/ComponentArray";
import { HealthComponentArray } from "../components/HealthComponent";
import { InventoryComponentArray, getInventory } from "../components/InventoryComponent";
import { addCrossbowLoadProgressRecordToPacket, getCrossbowLoadProgressRecordLength, InventoryUseComponentArray, LimbInfo } from "../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import { SERVER } from "./server";
import { Settings } from "battletribes-shared/settings";
import { GrassBlocker } from "battletribes-shared/grass-blockers";
import { addEntityDebugDataToPacket, createEntityDebugData, getEntityDebugDataLength } from "../entity-debug-data";
import PlayerClient from "./PlayerClient";
import { PlayerComponentArray } from "../components/PlayerComponent";
import { Inventory, InventoryName } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../components/TransformComponent";
import { EntityConfig } from "../components";
import { alignLengthBytes, Packet, PacketType } from "battletribes-shared/packets";
import { entityExists, getEntityLayer, getEntitySpawnTicks, getEntityType, getGameTicks, getGameTime, getTribes } from "../world";
import { getPlayerNearbyCollapses, getSubtileSupport, subtileIsCollapsing } from "../collapses";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { layers } from "../layers";
import { addExtendedTribeData, addShortTribeData, getExtendedTribeDataLength, getShortTribeDataLength, shouldAddTribeExtendedData } from "../Tribe";
import { addDevPacketData, getDevPacketDataLength } from "./dev-packet-creation";

export function getInventoryDataLength(inventory: Inventory): number {
   let lengthBytes = 4 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT * inventory.items.length;
   return lengthBytes;
}

export function addInventoryDataToPacket(packet: Packet, inventory: Inventory): void {
   packet.addNumber(inventory.name);
   packet.addNumber(inventory.width);
   packet.addNumber(inventory.height);

   packet.addNumber(inventory.items.length);
   for (let j = 0; j < inventory.items.length; j++) {
      const item = inventory.items[j];
      const itemSlot = inventory.getItemSlot(item);
      
      packet.addNumber(itemSlot);
      packet.addNumber(item.id);
      packet.addNumber(item.type);
      packet.addNumber(item.count);
   }
}

export function getEntityDataLength(entity: Entity, player: Entity | null): number {
   let lengthBytes = 5 * Float32Array.BYTES_PER_ELEMENT;

   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];

      if (componentArray.hasComponent(entity)) {
         lengthBytes += componentArray.getDataLength(entity, player);
      }
   }

   return lengthBytes;
}

export function addEntityDataToPacket(packet: Packet, entity: Entity, player: Entity | null): void {
   // Entity ID, type, spawn time, and layer
   packet.addNumber(entity);
   packet.addNumber(getEntityType(entity));
   // @Bandwidth: Only include when client doesn't know about this information
   packet.addNumber(getEntitySpawnTicks(entity));
   packet.addNumber(layers.indexOf(getEntityLayer(entity)));

   // @Speed
   let numComponents = 0;
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];
      if (componentArray.hasComponent(entity)) {
         numComponents++;
      }
   }

   // Components
   packet.addNumber(numComponents);
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];

      // @Speed
      if (componentArray.hasComponent(entity)) {
         const start = packet.currentByteOffset;
         
         packet.addNumber(componentArray.componentType);
         componentArray.addDataToPacket(packet, entity, player);

         // @Speed
         if (packet.currentByteOffset - start !== componentArray.getDataLength(entity, player)) {
            throw new Error(`Component type '${ServerComponentTypeString[componentArray.componentType]}' has wrong data length for entity type '${EntityTypeString[getEntityType(entity)]}'.`)
         }
      }
   }
}

const getVisibleGrassBlockers = (layer: Layer, visibleChunkBounds: VisibleChunkBounds): ReadonlyArray<GrassBlocker> => {
   const visibleGrassBlockers = new Array<GrassBlocker>();
   const seenBlockers = new Set<GrassBlocker>();
   
   for (let chunkX = visibleChunkBounds[0]; chunkX <= visibleChunkBounds[1]; chunkX++) {
      for (let chunkY = visibleChunkBounds[2]; chunkY <= visibleChunkBounds[3]; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const grassBlocker of chunk.grassBlockers) {
            if (seenBlockers.has(grassBlocker)) {
               continue;
            }
            
            seenBlockers.add(grassBlocker);
            visibleGrassBlockers.push(grassBlocker);
         }
      }
   }

   return visibleGrassBlockers;
}

const getVisibleMinedSubtiles = (playerClient: PlayerClient): ReadonlyArray<number> => {
   const minedSubtiles = new Array<number>();
   
   for (let chunkX = playerClient.minVisibleChunkX; chunkX <= playerClient.maxVisibleChunkX; chunkX++) {
      for (let chunkY = playerClient.minVisibleChunkY; chunkY <= playerClient.maxVisibleChunkY; chunkY++) {
         const minSubtileX = chunkX * Settings.CHUNK_SIZE * 4;
         const maxSubtileX = (chunkX + 1) * Settings.CHUNK_SIZE * 4 - 1;
         const minSubtileY = chunkY * Settings.CHUNK_SIZE * 4;
         const maxSubtileY = (chunkY + 1) * Settings.CHUNK_SIZE * 4 - 1;
         
         for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
            for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
               const subtile = getSubtileIndex(subtileX, subtileY);
               if (playerClient.lastLayer.subtileIsMined(subtile)) {
                  minedSubtiles.push(subtile);
               }
            }
         }
      }
   }

   return minedSubtiles;
}

export function createGameDataPacket(playerClient: PlayerClient, entitiesToSend: Set<Entity>): ArrayBuffer {
   // @Cleanup: The mined subtile system here exists really only to send particles. Can be entirely encompassed in a server particles system!

   const player = entityExists(playerClient.instance) ? playerClient.instance : null;
   const layer = playerClient.lastLayer;
   
   const tileUpdates = layer.popTileUpdates();

   const trackedEntity = SERVER.trackedEntityID;
   const debugData = typeof trackedEntity !== "undefined" ? createEntityDebugData(trackedEntity) : null;

   const tribes = getTribes();

   let hotbarUseInfo: LimbInfo | undefined;
   if (player !== null) {
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
      hotbarUseInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   }

   const titleOffer = player !== null ? PlayerComponentArray.getComponent(player).titleOffer : null;

   const minedSubtiles = getVisibleMinedSubtiles(playerClient);
   const nearbyCollapses = getPlayerNearbyCollapses(playerClient);
   
   // Packet type
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   // Is simulating
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   // Ticks, time
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   // Layer
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   // Viewed entity
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   // Player is alive
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;

   // Tribes
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const tribe of tribes) {
      if (shouldAddTribeExtendedData(playerClient, tribe)) {
         lengthBytes += getExtendedTribeDataLength(tribe);
      } else {
         lengthBytes += getShortTribeDataLength(tribe);
      }
   }

   // Entities
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const entity of entitiesToSend) {
      lengthBytes += getEntityDataLength(entity, player);
   }

   // Removed entity IDs
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * playerClient.visibleEntityDeathIDs.length;

   // Visible hits
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 7 * Float32Array.BYTES_PER_ELEMENT * playerClient.visibleHits.length;
   // Player knockback
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 2 * Float32Array.BYTES_PER_ELEMENT * playerClient.playerKnockbacks.length;
   // Player heals
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 5 * Float32Array.BYTES_PER_ELEMENT * playerClient.heals.length;
   // Visible entity deaths
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * playerClient.visibleEntityDeathIDs.length;
   // Orb completes
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * playerClient.orbCompletes.length;
   // Tile updates
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * tileUpdates.length;

   // Wall subtile updates
   for (const layer of layers) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * layer.wallSubtileUpdates.length * Float32Array.BYTES_PER_ELEMENT;
   }
   
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;

   // Has debug data boolean
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   const debugDataLength = debugData !== null ? getEntityDebugDataLength(debugData) : 0;
   lengthBytes += debugDataLength;

   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   if (player !== null) {
      lengthBytes += getCrossbowLoadProgressRecordLength(hotbarUseInfo!);
   }

   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (titleOffer !== null) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   }

   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * playerClient.entityTickEvents.length;

   // Mined subtiles
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT * minedSubtiles.length;

   // Collapses
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * nearbyCollapses.length;

   lengthBytes += getDevPacketDataLength(playerClient);
   
   lengthBytes = alignLengthBytes(lengthBytes);

   const packet = new Packet(PacketType.gameData, lengthBytes);

   // Whether or not the simulation is paused
   packet.addBoolean(!SERVER.isSimulating);
   packet.padOffset(3);

   packet.addNumber(getGameTicks());
   packet.addNumber(getGameTime());

   packet.addNumber(layers.indexOf(layer));

   packet.addNumber(playerClient.viewedEntity);

   packet.addBoolean(player !== null);
   packet.padOffset(3);

   // Tribes
   packet.addNumber(tribes.length);
   addExtendedTribeData(packet, playerClient.tribe); // Always add player at index 0
   for (const tribe of tribes) {
      // Player tribe is already added
      if (tribe === playerClient.tribe) {
         continue;
      }

      if (shouldAddTribeExtendedData(playerClient, tribe)) {
         addExtendedTribeData(packet, tribe);
      } else {
         addShortTribeData(packet, tribe);
      }
   }

   // Add entities
   packet.addNumber(entitiesToSend.size);
   for (const entity of entitiesToSend) {
      addEntityDataToPacket(packet, entity, player);
   }

   // Removed entity IDs
   packet.addNumber(playerClient.visibleEntityDeathIDs.length);
   for (const entity of playerClient.visibleEntityDeathIDs) {
      packet.addNumber(entity);
   }
   
   // Add visible hits
   packet.addNumber(playerClient.visibleHits.length);
   for (let i = 0; i < playerClient.visibleHits.length; i++) {
      const hitData = playerClient.visibleHits[i];
      packet.addNumber(hitData.hitEntityID);
      packet.addNumber(hitData.hitPosition[0]);
      packet.addNumber(hitData.hitPosition[1]);
      packet.addNumber(hitData.attackEffectiveness);
      packet.addNumber(hitData.damage);
      packet.addBoolean(hitData.shouldShowDamageNumber);
      packet.padOffset(3);
      packet.addNumber(hitData.flags);
   }

   // Add player knockbacks
   packet.addNumber(playerClient.playerKnockbacks.length);
   for (let i = 0; i < playerClient.playerKnockbacks.length; i++) {
      const knockbackData = playerClient.playerKnockbacks[i];
      packet.addNumber(knockbackData.knockback);
      packet.addNumber(knockbackData.knockbackDirection);
   }

   // Add player heals
   packet.addNumber(playerClient.heals.length);
   for (let i = 0; i < playerClient.heals.length; i++) {
      const healData = playerClient.heals[i];
      packet.addNumber(healData.entityPositionX);
      packet.addNumber(healData.entityPositionY);
      packet.addNumber(healData.healedID);
      packet.addNumber(healData.healerID);
      packet.addNumber(healData.healAmount);
   }

   // Visible entity deaths
   packet.addNumber(playerClient.visibleEntityDeathIDs.length);
   for (let i = 0; i < playerClient.visibleEntityDeathIDs.length; i++) {
      const entity = playerClient.visibleEntityDeathIDs[i];
      packet.addNumber(entity);
   }

   // Orb completes
   packet.addNumber(playerClient.orbCompletes.length);
   for (let i = 0; i < playerClient.orbCompletes.length; i++) {
      const orbCompleteData = playerClient.orbCompletes[i];
      packet.addNumber(orbCompleteData.x);
      packet.addNumber(orbCompleteData.y);
      packet.addNumber(orbCompleteData.amount);
   }
   
   // Tile updates
   packet.addNumber(tileUpdates.length);
   for (let i = 0; i < tileUpdates.length; i++) {
      const tileUpdate = tileUpdates[i];
      packet.addNumber(tileUpdate.tileIndex);
      packet.addNumber(tileUpdate.type);
   }

   // Wall subtile updates
   for (const layer of layers) {
      packet.addNumber(layer.wallSubtileUpdates.length);
      for (const subtileUpdate of layer.wallSubtileUpdates) {
         packet.addNumber(subtileUpdate.subtileIndex);
         packet.addNumber(subtileUpdate.subtileType);
         packet.addNumber(subtileUpdate.damageTaken);
      }
   }

   // @Hack: why is this necessary? the player should be able to gather this information simply
   // from the health component's health value and whether or not the player has its data sent
   packet.addNumber(player !== null ? HealthComponentArray.getComponent(player).health : 0);

   // @Bug: Shared for all players
   if (debugData !== null) {
      packet.addBoolean(true);
      packet.padOffset(3);
      
      const start = packet.currentByteOffset;
      addEntityDebugDataToPacket(packet, trackedEntity, debugData);
      if (packet.currentByteOffset - start !== debugDataLength) {
         throw new Error(`Debug data had unexpected length. Expected: ${debugDataLength}. Got: ${packet.currentByteOffset - start}`);
      }
   } else {
      packet.addBoolean(false);
      packet.padOffset(3);
   }

   // @Incomplete
   // hasFrostShield: player.immunityTimer === 0 && playerArmour !== null && playerArmour.type === ItemType.deepfrost_armour,

   packet.addBoolean(false);
   packet.padOffset(3);

   packet.addBoolean(playerClient.hasPickedUpItem);
   packet.padOffset(3);

   if (player !== null) {
      addCrossbowLoadProgressRecordToPacket(packet, hotbarUseInfo!);
   }

   // Title offer
   packet.addBoolean(titleOffer !== null);
   packet.padOffset(3);
   if (titleOffer !== null) {
      packet.addNumber(titleOffer);
   }
   
   // Tick events
   packet.addNumber(playerClient.entityTickEvents.length);
   for (const tickEvent of playerClient.entityTickEvents) {
      packet.addNumber(tickEvent.entityID);
      packet.addNumber(tickEvent.type);
      packet.addNumber(tickEvent.data as number);
   }

   // Mined subtiles
   packet.addNumber(minedSubtiles.length);
   for (const subtileIndex of minedSubtiles) {
      packet.addNumber(subtileIndex);

      const subtileType = layer.getMinedSubtileType(subtileIndex);
      packet.addNumber(subtileType);
      
      const support = getSubtileSupport(layer, subtileIndex);
      packet.addNumber(support);

      packet.addBoolean(subtileIsCollapsing(subtileIndex));
      packet.padOffset(3);
   }

   // Collapses
   packet.addNumber(nearbyCollapses.length);
   // @Cleanup: unused?
   for (const [collapse, subtileIndex] of nearbyCollapses) {
      packet.addNumber(subtileIndex);
      packet.addNumber(collapse.age);
   }

   // Dev data
   packet.addBoolean(playerClient.isDev);
   packet.padOffset(3);
   if (playerClient.isDev) {
      addDevPacketData(packet, playerClient);
   }
   
   // const visibleTribes = getVisibleTribes(extendedVisibleChunkBounds);

   // const gameDataPacket: GameDataPacket = {
      // simulationIsPaused: !SERVER.isSimulating,
      // entityDataArray: bundleEntityDataArray(player, playerClient.tribe, extendedVisibleChunkBounds),
      // inventory: bundlePlayerInventoryData(player),
      // visibleHits: playerClient.visibleHits,
      // playerKnockbacks: playerClient.playerKnockbacks,
      // heals: playerClient.heals,
      // visibleEntityDeathIDs: playerClient.visibleEntityDeathIDs,
      // orbCompletes: playerClient.orbCompletes,
      // tileUpdates: tileUpdates,
      // serverTicks: Board.ticks,
      // serverTime: Board.time,
      // playerHealth: player !== null ? HealthComponentArray.getComponent(player).health : 0,
      // entityDebugData: entityDebugData,
      // playerTribeData: bundlePlayerTribeData(playerClient),
      // enemyTribesData: bundleEnemyTribesData(playerClient),
      // @Incomplete
      // hasFrostShield: player.immunityTimer === 0 && playerArmour !== null && playerArmour.type === ItemType.deepfrost_armour,
      // hasFrostShield: false,
      // pickedUpItem: playerClient.hasPickedUpItem,
      // hotbarCrossbowLoadProgressRecord: bundleHotbarCrossbowLoadProgressRecord(player),
      // titleOffer: player !== null ? PlayerComponentArray.getComponent(player).titleOffer : null,
      // tickEvents: playerClient.entityTickEvents,

      // @Incomplete
      // @Incomplete
      // @Incomplete
      // @Cleanup: Copy and paste
      // visibleSafetyNodes: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleSafetyNodes) ? getVisibleSafetyNodesData(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleBuildingPlans: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleBuildingPlans) ? getVisibleBuildingPlans(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleBuildingSafetys: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleBuildingSafetys) ? getVisibleBuildingSafetys(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleRestrictedBuildingAreas: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleRestrictedBuildingAreas) ? getVisibleRestrictedBuildingAreas(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleWalls: getVisibleWallsData(visibleTribes, extendedVisibleChunkBounds),
      // visibleWallConnections: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleWallConnections) ? getVisibleWallConnections(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleGrassBlockers: getVisibleGrassBlockers(playerClient.visibleChunkBounds)
   // };

   return packet.buffer;
}

export function createInitialGameDataPacket(player: Entity, spawnLayer: Layer, playerConfig: EntityConfig<ServerComponentType.transform>): ArrayBuffer {
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT * 5;
   // Layers
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   // Per-tile data
   lengthBytes += layers.length * Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS * 6 * Float32Array.BYTES_PER_ELEMENT;
   // Subtile data
   lengthBytes += layers.length * Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS * 16 * Float32Array.BYTES_PER_ELEMENT;
   // Subtile damage taken
   for (const layer of layers) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT + layer.wallSubtileDamageTakenMap.size * 2 * Float32Array.BYTES_PER_ELEMENT;
   }
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + spawnLayer.waterRocks.length * 5 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + spawnLayer.riverSteppingStones.length * 5 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes = alignLengthBytes(lengthBytes);
   const packet = new Packet(PacketType.initialGameData, lengthBytes);
   
   packet.addNumber(player);

   // Layer idx
   packet.addNumber(layers.indexOf(spawnLayer));
   
   // Spawn position
   const spawnPosition = playerConfig.components[ServerComponentType.transform].position;
   packet.addNumber(spawnPosition.x);
   packet.addNumber(spawnPosition.y);
   
   // Layers and their terrain data
   packet.addNumber(layers.length);
   for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx];
      // Per-tile data
      for (let tileIndex = 0; tileIndex < Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS; tileIndex++) {
         packet.addNumber(layer.tileTypes[tileIndex]);
         packet.addNumber(layer.tileBiomes[tileIndex]);
         packet.addNumber(layer.riverFlowDirections[tileIndex]);
         packet.addNumber(layer.tileTemperatures[tileIndex]);
         packet.addNumber(layer.tileHumidities[tileIndex]);
      }

      // Subtiles
      const subtiles = layer.getSubtileTypes();
      for (let i = 0; i < Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS * 16; i++) {
         packet.addNumber(subtiles[i]);
      }

      // Subtile damage taken
      packet.addNumber(layer.wallSubtileDamageTakenMap.size);
      for (const [subtileIndex, damageTaken] of layer.wallSubtileDamageTakenMap) {
         packet.addNumber(subtileIndex);
         packet.addNumber(damageTaken);
      }
   }

   packet.addNumber(spawnLayer.waterRocks.length);
   for (let i = 0; i < spawnLayer.waterRocks.length; i++) {
      const waterRock = spawnLayer.waterRocks[i];

      packet.addNumber(waterRock.position[0]);
      packet.addNumber(waterRock.position[1]);
      packet.addNumber(waterRock.rotation);
      packet.addNumber(waterRock.size);
      packet.addNumber(waterRock.opacity);
   }

   packet.addNumber(spawnLayer.riverSteppingStones.length);
   for (let i = 0; i < spawnLayer.riverSteppingStones.length; i++) {
      const steppingStone = spawnLayer.riverSteppingStones[i];

      packet.addNumber(steppingStone.positionX);
      packet.addNumber(steppingStone.positionY);
      packet.addNumber(steppingStone.rotation);
      packet.addNumber(steppingStone.size);
      packet.addNumber(steppingStone.groupID);
   }

   return packet.buffer;
}

export  function createSyncPacket(): ArrayBuffer {
   const packet = new Packet(PacketType.sync, Float32Array.BYTES_PER_ELEMENT);
   return packet.buffer;
}

export function createSyncDataPacket(playerClient: PlayerClient): ArrayBuffer {
   const player = playerClient.instance;

   // @Copynpaste @Robustness
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const backpackInventory = getInventory(inventoryComponent, InventoryName.backpack);
   const backpackSlotInventory = getInventory(inventoryComponent, InventoryName.backpackSlot);
   const heldItemSlotInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot);
   const craftingOutputSlotInventory = getInventory(inventoryComponent, InventoryName.craftingOutputSlot);
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
   const offhandInventory = getInventory(inventoryComponent, InventoryName.offhand);
   const gloveSlotInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);

   let lengthBytes = 11 * Float32Array.BYTES_PER_ELEMENT;
   
   // Player inventories
   lengthBytes += getInventoryDataLength(hotbarInventory);
   lengthBytes += getInventoryDataLength(backpackInventory);
   lengthBytes += getInventoryDataLength(backpackSlotInventory);
   lengthBytes += getInventoryDataLength(heldItemSlotInventory);
   lengthBytes += getInventoryDataLength(craftingOutputSlotInventory);
   lengthBytes += getInventoryDataLength(armourSlotInventory);
   lengthBytes += getInventoryDataLength(offhandInventory);
   lengthBytes += getInventoryDataLength(gloveSlotInventory);

   const packet = new Packet(PacketType.syncData, lengthBytes);
   
   const transformComponent = TransformComponentArray.getComponent(player);
   packet.addNumber(transformComponent.position.x);
   packet.addNumber(transformComponent.position.y);
   packet.addNumber(transformComponent.rotation);

   const physicsComponent = PhysicsComponentArray.getComponent(player);
   packet.addNumber(physicsComponent.selfVelocity.x);
   packet.addNumber(physicsComponent.selfVelocity.y);
   packet.addNumber(physicsComponent.externalVelocity.x);
   packet.addNumber(physicsComponent.externalVelocity.y);
   packet.addNumber(physicsComponent.acceleration.x);
   packet.addNumber(physicsComponent.acceleration.y);

   // Add inventory data
   addInventoryDataToPacket(packet, hotbarInventory);
   addInventoryDataToPacket(packet, backpackInventory);
   addInventoryDataToPacket(packet, backpackSlotInventory);
   addInventoryDataToPacket(packet, heldItemSlotInventory);
   addInventoryDataToPacket(packet, craftingOutputSlotInventory);
   addInventoryDataToPacket(packet, armourSlotInventory);
   addInventoryDataToPacket(packet, offhandInventory);
   addInventoryDataToPacket(packet, gloveSlotInventory);

   return packet.buffer;
}