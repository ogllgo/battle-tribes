import { VisibleChunkBounds } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { TribeType } from "battletribes-shared/tribes";
import { Point, randInt } from "battletribes-shared/utils";
import { PacketReader, PacketType } from "battletribes-shared/packets";
import WebSocket, { Server } from "ws";
import { noteSpawnableTiles, runSpawnAttempt, spawnInitialEntities } from "../entity-spawning";
import Tribe from "../Tribe";
import SRandom from "../SRandom";
import { updateDynamicPathfindingNodes } from "../pathfinding";
import { countTileTypesForResourceDistributions, updateResourceDistributions } from "../resource-distributions";
import { updateGrassBlockers } from "../grass-blockers";
import { createGameDataPacket, createSyncDataPacket, createSyncPacket } from "./packet-creation";
import PlayerClient, { PlayerClientVars } from "./PlayerClient";
import { addPlayerClient, generatePlayerSpawnPosition, getPlayerClients, handlePlayerDisconnect, resetDirtyEntities } from "./player-clients";
import { createPlayerConfig } from "../entities/tribes/player";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntity } from "../Entity";
import { generateGrassStrands } from "../world-generation/grass-generation";
import { processAnimalStaffFollowCommandPacket, processAscendPacket, processDevGiveItemPacket, processDismountCarrySlotPacket, processEntitySummonPacket, processItemDropPacket, processItemPickupPacket, processItemReleasePacket, processModifyBuildingPacket, processMountCarrySlotPacket, processPickUpArrowPacket, processPlaceBlueprintPacket, processPlayerAttackPacket, processPlayerCraftingPacket, processPlayerDataPacket, processRespawnPacket, processSelectTechPacket, processSetAttackTargetPacket, processSetAutogiveBaseResourcesPacket, processSetCarryTargetPacket, processSpectateEntityPacket, processStartItemUsePacket, processStopItemUsePacket, processStructureInteractPacket, processTechStudyPacket, processTechUnlockPacket, processToggleSimulationPacket, processTPToEntityPacket, processUseItemPacket } from "./packet-processing";
import { Entity, EntityType } from "battletribes-shared/entities";
import { SpikesComponentArray } from "../components/SpikesComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { generateDecorations } from "../world-generation/decoration-generation";
import { forceMaxGrowAllIceSpikes } from "../components/IceSpikesComponent";
import { sortComponentArrays } from "../components/ComponentArray";
import { destroyFlaggedEntities, entityExists, getEntityLayer, getGameTicks, pushJoinBuffer, tickGameTime, tickEntities, generateLayers, getEntityType } from "../world";
import { spawnGuardians } from "../world-generation/cave-entrance-generation";
import { resolveEntityCollisions } from "../collision-detection";
import { runCollapses } from "../collapses";
import { updateTribes } from "../tribes";
import { surfaceLayer, layers } from "../layers";
import { generateReeds } from "../world-generation/reed-generation";
import { riverMainTiles } from "../world-generation/surface-layer-generation";
import OPTIONS from "../options";

/*

Reference for future self:
node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > processed.txt

*/

const entityIsHiddenFromPlayer = (entity: Entity, playerTribe: Tribe): boolean => {
   if (SpikesComponentArray.hasComponent(entity) && TribeComponentArray.hasComponent(entity)) {
      const tribeComponent = TribeComponentArray.getComponent(entity);
      const spikesComponent = SpikesComponentArray.getComponent(entity);
      
      if (spikesComponent.isCovered && tribeComponent.tribe !== playerTribe) {
         return true;
      }
   }

   return false;
}

const addEntityCarryHierarchy = (entities: Set<Entity>, mount: Entity): void => {
   entities.add(mount);

   const mountTransformComponent = TransformComponentArray.getComponent(mount);
   for (const carryInfo of mountTransformComponent.carriedEntities) {
      addEntityCarryHierarchy(entities, carryInfo.carriedEntity);
   }
}

const getPlayerVisibleEntities = (playerClient: PlayerClient): Set<Entity> => {
   const layer = playerClient.lastLayer;
   
   const entities = new Set<Entity>();
      
   // @Copynpaste
   const minVisibleX = playerClient.lastViewedPositionX - playerClient.screenWidth * 0.5 - PlayerClientVars.VIEW_PADDING;
   const maxVisibleX = playerClient.lastViewedPositionX + playerClient.screenWidth * 0.5 + PlayerClientVars.VIEW_PADDING;
   const minVisibleY = playerClient.lastViewedPositionY - playerClient.screenHeight * 0.5 - PlayerClientVars.VIEW_PADDING;
   const maxVisibleY = playerClient.lastViewedPositionY + playerClient.screenHeight * 0.5 + PlayerClientVars.VIEW_PADDING;
   
   for (let chunkX = playerClient.minVisibleChunkX; chunkX <= playerClient.maxVisibleChunkX; chunkX++) {
      for (let chunkY = playerClient.minVisibleChunkY; chunkY <= playerClient.maxVisibleChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (entityIsHiddenFromPlayer(entity, playerClient.tribe)) {
               continue;
            }

            const transformComponent = TransformComponentArray.getComponent(entity);
            if (transformComponent.boundingAreaMinX <= maxVisibleX && transformComponent.boundingAreaMaxX >= minVisibleX && transformComponent.boundingAreaMinY <= maxVisibleY && transformComponent.boundingAreaMaxY >= minVisibleY) {
               // @Speed?
               addEntityCarryHierarchy(entities, transformComponent.carryRoot);
            }
         }
      }
   }

   return entities;
}

const estimateVisibleChunkBounds = (spawnPosition: Point, screenWidth: number, screenHeight: number): VisibleChunkBounds => {
   const zoom = 1;

   const halfScreenWidth = screenWidth * 0.5;
   const halfScreenHeight = screenHeight * 0.5;
   
   const minChunkX = Math.max(Math.floor((spawnPosition.x - halfScreenWidth / zoom) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((spawnPosition.x + halfScreenWidth / zoom) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((spawnPosition.y - halfScreenHeight / zoom) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((spawnPosition.y + halfScreenHeight / zoom) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   return [minChunkX, maxChunkX, minChunkY, maxChunkY];
}

// @Cleanup: Remove class, just have functions
/** Communicates between the server and players */
class GameServer {
   private server: Server | null = null;

   private tickInterval: NodeJS.Timeout | undefined;

   public trackedEntityID = 0;

   public isRunning = false;
   public isSimulating = true;

   public setTrackedGameObject(id: number): void {
      SERVER.trackedEntityID = id;
   }

   public async start(): Promise<void> {
      // Seed the random number generator
      if (OPTIONS.inBenchmarkMode) {
         SRandom.seed(40404040404);
      } else {
         SRandom.seed(randInt(0, 9999999999));
      }
      // SRandom.seed(2620761354);

      const builtinRandomFunc = Math.random;
      Math.random = () => SRandom.next();

      let a = performance.now();
      console.log("start",a)

      // Setup
      sortComponentArrays();
      console.log("Generating terrain...")
      generateLayers();
      console.log("terrain",performance.now() - a)
      a = performance.now();

      noteSpawnableTiles();
      countTileTypesForResourceDistributions();
      updateResourceDistributions();
      console.log("resources",performance.now() - a)
      a = performance.now();
      
      generateReeds(surfaceLayer, riverMainTiles);

      console.log("Spawning entities...");
      spawnInitialEntities();
      console.log("initial entities",performance.now() - a)
      a = performance.now();
      forceMaxGrowAllIceSpikes();
      console.log("ice spikes",performance.now() - a)
      a = performance.now();
      generateGrassStrands();
      console.log("grass",performance.now() - a)
      a = performance.now();
      generateDecorations();
      console.log("decorations",performance.now() - a)
      a = performance.now();
      spawnGuardians();
      console.log("guardians",performance.now() - a)
      a = performance.now();

      Math.random = builtinRandomFunc;

      this.server = new Server({
         port: Settings.SERVER_PORT
      });

      // Handle player connections
      this.server.on("connection", (socket: WebSocket) => {
         let playerClient: PlayerClient;

         socket.on("close", () => {
            // @Bug: there are cases where the playerClient is undefined here, which causes the server to crash
            handlePlayerDisconnect(playerClient);
         });
         
         socket.on("message", (message: Buffer) => {
            const reader = new PacketReader(message.buffer, message.byteOffset);
            const packetType = reader.readNumber() as PacketType;

            switch (packetType) {
               case PacketType.initialPlayerData: {
                  const username = reader.readString();
                  const tribeType = reader.readNumber() as TribeType;
                  const screenWidth = reader.readNumber();
                  const screenHeight = reader.readNumber();

                  const spawnPosition = generatePlayerSpawnPosition(tribeType);
                  // @Incomplete? Unused?
                  const visibleChunkBounds = estimateVisibleChunkBounds(spawnPosition, screenWidth, screenHeight);
      
                  const tribe = new Tribe(tribeType, false, spawnPosition.copy());
                  const layer = surfaceLayer;
      
                  // @Temporary @Incomplete
                  const isDev = true;
                  playerClient = new PlayerClient(socket, tribe, layer, screenWidth, screenHeight, spawnPosition, 0, username, isDev);
      
                  const config = createPlayerConfig(tribe, playerClient);
                  config.components[ServerComponentType.transform].position.x = spawnPosition.x;
                  config.components[ServerComponentType.transform].position.y = spawnPosition.y;
                  createEntity(config, layer, 0);
                  
                  addPlayerClient(playerClient, surfaceLayer, config);

                  break;
               }
               case PacketType.playerData: {
                  processPlayerDataPacket(playerClient, reader);
                  break;
               }
               case PacketType.activate: {
                  playerClient.clientIsActive = true;
                  break;
               }
               case PacketType.syncRequest: {
                  if (entityExists(playerClient.instance)) {
                     const buffer = createSyncDataPacket(playerClient);
                     socket.send(buffer);
                  } else {
                     const buffer = createSyncPacket();
                     socket.send(buffer);
                  }
                  break;
               }
               case PacketType.attack: {
                  processPlayerAttackPacket(playerClient, reader);
                  break;
               }
               case PacketType.devGiveItem: {
                  processDevGiveItemPacket(playerClient, reader);
                  break;
               }
               case PacketType.respawn: {
                  processRespawnPacket(playerClient);
                  break;
               }
               case PacketType.startItemUse: {
                  processStartItemUsePacket(playerClient, reader);
                  break;
               }
               case PacketType.useItem: {
                  processUseItemPacket(playerClient, reader);
                  break;
               }
               case PacketType.stopItemUse: {
                  processStopItemUsePacket(playerClient);
                  break;
               }
               case PacketType.dropItem: {
                  processItemDropPacket(playerClient, reader);
                  break;
               }
               case PacketType.itemPickup: {
                  processItemPickupPacket(playerClient, reader);
                  break;
               }
               case PacketType.itemRelease: {
                  processItemReleasePacket(playerClient, reader);
                  break;
               }
               case PacketType.summonEntity: {
                  processEntitySummonPacket(playerClient, reader);
                  break;
               }
               case PacketType.toggleSimulation: {
                  processToggleSimulationPacket(playerClient, reader);
                  break;
               }
               case PacketType.placeBlueprint: {
                  processPlaceBlueprintPacket(playerClient, reader);
                  break;
               }
               case PacketType.craftItem: {
                  processPlayerCraftingPacket(playerClient, reader);
                  break;
               }
               case PacketType.ascend: {
                  processAscendPacket(playerClient);
                  break;
               }
               case PacketType.devSetDebugEntity: {
                  const entity: Entity = reader.readNumber();
                  // @Cleanup: shouldn't be in the server!
                  SERVER.setTrackedGameObject(entity);
                  break;
               }
               case PacketType.devTPToEntity: {
                  processTPToEntityPacket(playerClient, reader);
                  break;
               }
               case PacketType.devSpectateEntity: {
                  processSpectateEntityPacket(playerClient, reader);
                  break;
               }
               case PacketType.devSetAutogiveBaseResource: {
                  processSetAutogiveBaseResourcesPacket(reader);
                  break;
               }
               case PacketType.structureInteract: {
                  processStructureInteractPacket(playerClient, reader);
                  break;
               }
               case PacketType.unlockTech: {
                  processTechUnlockPacket(playerClient, reader);
                  break;
               }
               case PacketType.selectTech: {
                  processSelectTechPacket(playerClient, reader);
                  break;
               }
               case PacketType.studyTech: {
                  processTechStudyPacket(playerClient, reader);
                  break;
               }
               case PacketType.animalStaffFollowCommand: {
                  processAnimalStaffFollowCommandPacket(playerClient, reader);
                  break;
               }
               case PacketType.mountCarrySlot: {
                  processMountCarrySlotPacket(playerClient, reader);
                  break;
               }
               case PacketType.dismountCarrySlot: {
                  processDismountCarrySlotPacket(playerClient);
                  break;
               }
               case PacketType.pickUpArrow: {
                  processPickUpArrowPacket(playerClient, reader);
                  break;
               }
               case PacketType.modifyBuilding: {
                  processModifyBuildingPacket(playerClient, reader);
                  break;
               }
               case PacketType.setCarryTarget: {
                  processSetCarryTargetPacket(playerClient, reader);
                  break;
               }
               case PacketType.setAttackTarget: {
                  processSetAttackTargetPacket(playerClient, reader);
                  break;
               }
               default: {
                  console.log("Unknown packet type: " + packetType);
               }
            }
         });
      });

      SERVER.isRunning = true;
      
      if (typeof SERVER.tickInterval === "undefined") {
         console.log("Server started on port " + Settings.SERVER_PORT);
         setInterval(SERVER.tick, 1000 / Settings.TPS);
      }
   }

   private async tick(): Promise<void> {
      // These are done before each tick to account for player packets causing entities to be removed/added between ticks.
      pushJoinBuffer(false);
      destroyFlaggedEntities();

      if (SERVER.isSimulating) {
         updateTribes();
         
         updateGrassBlockers();
         runCollapses();
         
         tickEntities();
         updateDynamicPathfindingNodes();

         for (const layer of layers) {
            resolveEntityCollisions(layer);
         }
         
         if (getGameTicks() % Settings.TPS === 0) {
            updateResourceDistributions();
            runSpawnAttempt();
         }
         
         pushJoinBuffer(true);
         destroyFlaggedEntities();
         // @Bug @Incomplete: Called twice!!!!
         updateTribes();
      }

      SERVER.sendGameDataPackets();

      // Update server ticks and time
      // This is done at the end of the tick so that information sent by players is associated with the next tick to run
      tickGameTime();
   }

   // @Cleanup: maybe move this function to player-clients?
   /** Send data about the server to all players */
   public sendGameDataPackets(): void {
      if (this.server === null) return;
      
      // @Cleanup: should this all be in this file?
      
      const playerClients = getPlayerClients();
      for (let i = 0; i < playerClients.length; i++) {
         const playerClient = playerClients[i];
         if (!playerClient.clientIsActive) {
            continue;
         }

         const viewedEntity = playerClient.cameraSubject;

         // Update player client info
         if (entityExists(viewedEntity)) {
            const transformComponent = TransformComponentArray.getComponent(viewedEntity);
            playerClient.lastViewedPositionX = transformComponent.position.x;
            playerClient.lastViewedPositionY = transformComponent.position.y;

            playerClient.lastLayer = getEntityLayer(viewedEntity);
         }
      
         const visibleEntities = getPlayerVisibleEntities(playerClient);
         
         const entitiesToSend = new Set<Entity>();

         // Send all newly visible entities
         // @Speed
         for (const visibleEntity of visibleEntities) {
            if (!playerClient.visibleEntities.has(visibleEntity)) {
               entitiesToSend.add(visibleEntity);
            }
         }

         // Send dirty entities
         for (const entity of playerClient.visibleDirtiedEntities) {
            // Sometimes entities are simultaneously removed from the board and on the visible dirtied list, this catches that
            if (entityExists(entity)) {
               entitiesToSend.add(entity);
            }
         }

         // Always send the viewed entity (if alive)
         if (entityExists(viewedEntity)) {
            entitiesToSend.add(viewedEntity);
         }
         
         // Send the game data to the player
         const gameDataPacket = createGameDataPacket(playerClient, entitiesToSend);
         playerClient.socket.send(gameDataPacket);

         playerClient.visibleEntities = visibleEntities;

         // @Cleanup: should these be here?
         playerClient.visibleHits = [];
         playerClient.playerKnockbacks = [];
         playerClient.heals = [];
         playerClient.orbCompletes = [];
         playerClient.hasPickedUpItem = false;
         playerClient.entityTickEvents = [];
         playerClient.visibleDirtiedEntities = [];
      }

      // @Hack?
      for (const layer of layers) {
         layer.wallSubtileUpdates = [];
      }

      resetDirtyEntities();
   }
}

export const SERVER = new GameServer();
SERVER.start();