import { VisibleChunkBounds } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { TribeType } from "battletribes-shared/tribes";
import { lerp, Point, randAngle, randFloat, randInt, smoothstep, unitsToChunksClamped } from "battletribes-shared/utils";
import { PacketReader, PacketType } from "battletribes-shared/packets";
import WebSocket, { Server } from "ws";
import { runSpawnAttempt, spawnInitialEntities } from "../entity-spawning";
import Tribe from "../Tribe";
import SRandom from "../SRandom";
import { updateDynamicPathfindingNodes } from "../pathfinding";
import { createGrassBlocker, updateGrassBlockers } from "../grass-blockers";
import { createGameDataPacket, createSyncDataPacket, createSyncPacket } from "./packet-creation";
import PlayerClient, { PlayerClientVars } from "./PlayerClient";
import { addPlayerClient, generatePlayerSpawnPosition, getPlayerClients, handlePlayerDisconnect, resetDirtyEntities } from "./player-clients";
import { createPlayerConfig } from "../entities/tribes/player";
import { generateGrassStrands } from "../world-generation/grass-generation";
import { processAcquireTamingSkillPacket, processAnimalStaffFollowCommandPacket, processAscendPacket, processCompleteTamingTierPacket, processDevGiveItemPacket, processDevSetViewedSpawnDistribution, processDismountCarrySlotPacket, processEntitySummonPacket, processForceAcquireTamingSkillPacket, processForceCompleteTamingTierPacket, processItemDropPacket, processItemPickupPacket, processItemReleasePacket, processModifyBuildingPacket, processMountCarrySlotPacket, processPickUpEntityPacket, processPlaceBlueprintPacket, processPlayerAttackPacket, processPlayerCraftingPacket, processPlayerDataPacket, processRenameAnimalPacket, processRespawnPacket, processSelectTechPacket, processSetAttackTargetPacket, processSetAutogiveBaseResourcesPacket, processSetCarryTargetPacket, processSetMoveTargetPositionPacket, processSetSignMessagePacket, processSetSpectatingPositionPacket, processSpectateEntityPacket, processStartItemUsePacket, processStopItemUsePacket, processStructureInteractPacket, processTechStudyPacket, processTechUnlockPacket, processToggleSimulationPacket, processTPToEntityPacket, processUseItemPacket } from "./packet-processing";
import { CowSpecies, Entity, EntityType, TreeSize } from "battletribes-shared/entities";
import { SpikesComponentArray } from "../components/SpikesComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { generateDecorations } from "../world-generation/decoration-generation";
import { forceMaxGrowAllIceSpikes } from "../components/IceSpikesComponent";
import { sortComponentArrays } from "../components/ComponentArray";
import { destroyFlaggedEntities, entityExists, getEntityLayer, pushEntityJoinBuffer, tickGameTime, tickEntities, generateLayers, getEntityType, preDestroyFlaggedEntities, getGameTicks, createEntity, destroyEntity, createEntityImmediate } from "../world";
import { resolveEntityCollisions } from "../collision-detection";
import { runCollapses } from "../collapses";
import { updateTribes } from "../tribes";
import { surfaceLayer, layers } from "../layers";
import { generateReeds } from "../world-generation/reed-generation";
import { riverMainTiles } from "../world-generation/surface-layer-generation";
import { Hitbox } from "../hitboxes";
import { updateWind } from "../wind";
import OPTIONS from "../options";
import { createDustfleaConfig } from "../entities/desert/dustflea";
import { createKrumblidConfig } from "../entities/mobs/krumblid";
import { createTribeWorkerConfig } from "../entities/tribes/tribe-worker";
import { createTribeWarriorConfig } from "../entities/tribes/tribe-warrior";
import { applyTethers } from "../tethers";
import { getEntityCount } from "../census";
import { damageEntity } from "../components/HealthComponent";
import { createWallConfig } from "../entities/structures/wall";
import { BuildingMaterial, DecorationType, ServerComponentType } from "../../../shared/src/components";
import { createDoorConfig } from "../entities/structures/door";
import { createTukmokConfig } from "../entities/tundra/tukmok";
import { createInguSerpentConfig } from "../entities/tundra/ingu-serpent";
import { createBarrelConfig } from "../entities/structures/barrel";
import { mountCarrySlot, RideableComponentArray } from "../components/RideableComponent";
import { createInguYetuksnoglurblidokowfleaConfig } from "../entities/wtf/ingu-yetuksnoglurblidokowflea";
import { createFenceConfig } from "../entities/structures/fence";
import { StructureConnection } from "../structure-placement";
import { createEmbrasureConfig } from "../entities/structures/embrasure";
import { createFenceGateConfig } from "../entities/structures/fence-gate";
import { createCowConfig } from "../entities/mobs/cow";
import { createTreeConfig } from "../entities/resources/tree";
import { createDecorationConfig } from "../entities/decoration";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import { createItemEntityConfig } from "../entities/item-entity";
import { ItemType } from "../../../shared/src/items/items";

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

const addEntityHierarchy = (playerClient: PlayerClient, entitiesToSend: Set<Entity>, entity: Entity): void => {
   entitiesToSend.add(entity);

   // @INCOMPLETE
   // const transformComponent = TransformComponentArray.getComponent(entity);
   // for (const child of transformComponent.children) {
   //    if (entityChildIsEntity(child)) {
   //       addEntityHierarchy(playerClient, entitiesToSend, child.attachedEntity);
   //    }
   // }
}

const getPlayerVisibleEntities = (playerClient: PlayerClient): Set<Entity> => {
   const layer = playerClient.lastLayer;

   const visibleEntities = new Set<Entity>();
   
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
            // @Hack @Temporary
            // if (!TransformComponentArray.hasComponent(transformComponent.rootEntity)) {
            //    continue;
            // }
            if (transformComponent.boundingAreaMinX <= maxVisibleX && transformComponent.boundingAreaMaxX >= minVisibleX && transformComponent.boundingAreaMinY <= maxVisibleY && transformComponent.boundingAreaMaxY >= minVisibleY) {
               // @Speed?
               // addEntityHierarchy(playerClient, visibleEntities, transformComponent.rootEntity);
               // @INCOMPLETE: NOT ADDING ROOT!
               addEntityHierarchy(playerClient, visibleEntities, entity);
            }
         }
      }
   }

   return visibleEntities;
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

let aaa = true;

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
      // if (OPTIONS.inBenchmarkMode) {
      //    SRandom.seed(40404040404);
      // } else {
      //    SRandom.seed(randInt(0, 9999999999));
      // }
      SRandom.seed(9079734040);
      // : the one with the tundra colliding the top and bottom world borders @Squeam
      // SRandom.seed(5128141131);

      const builtinRandomFunc = Math.random;
      Math.random = () => SRandom.next();

      let _SHITTYCUMMERY = performance.now();
      console.log("start",_SHITTYCUMMERY)

      // Setup
      sortComponentArrays();
      console.log("Generating terrain...")
      generateLayers();
      console.log("terrain",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();

      console.log("resources",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();
      
      generateReeds(surfaceLayer, riverMainTiles);

      console.log("Spawning entities...");
      spawnInitialEntities();
      console.log("initial entities",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();
      forceMaxGrowAllIceSpikes();
      console.log("ice spikes",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();
      generateGrassStrands();
      console.log("grass",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();
      generateDecorations();
      console.log("decorations",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();
      // spawnGuardians();
      // console.log("guardians",performance.now() - a)
      // a = performance.now();

      Math.random = builtinRandomFunc;

      this.server = new Server({
         port: Settings.SERVER_PORT
      });

      // Handle player connections
      this.server.on("connection", (socket: WebSocket) => {
         let playerClient: PlayerClient | undefined;

         socket.on("close", () => {
            // If the connection closes before the intial player data is sent then the player client will be undefined
            if (typeof playerClient !== "undefined") {
               handlePlayerDisconnect(playerClient);
            }
         });
         
         socket.on("message", (message: Buffer) => {
            const reader = new PacketReader(message.buffer, message.byteOffset);
            const packetType = reader.readNumber() as PacketType;

            if (packetType === PacketType.initialPlayerData) {
               const username = reader.readString();
               // @Temporary
               const tribeType = reader.readNumber() as TribeType;
               const tribeType2 = TribeType.goblins;
               const screenWidth = reader.readNumber();
               const screenHeight = reader.readNumber();

               const isSpectating = reader.readBoolean();
               reader.padOffset(3);

               const spawnPosition = generatePlayerSpawnPosition(tribeType);
               // @Incomplete? Unused?
               const visibleChunkBounds = estimateVisibleChunkBounds(spawnPosition, screenWidth, screenHeight);
   
               const tribe = new Tribe(tribeType, false, spawnPosition.copy());
               // @TEMPORARY @HACK
               // const layer = isSpectating ? undergroundLayer : surfaceLayer;
               const layer = surfaceLayer;
   
               // @Temporary @Incomplete
               const isDev = true;

               playerClient = new PlayerClient(socket, tribe, layer, screenWidth, screenHeight, spawnPosition, 0, username, isDev);
   
               if (!isSpectating) {
                  const config = createPlayerConfig(spawnPosition, 0, tribe, playerClient);
                  createEntity(config, layer, 0);
               }

               // @SQUEAM
               setTimeout(() => {
                  if (!aaa) {
                     return;
                  }
                  aaa = false;

                  const l = Settings.BOARD_UNITS * 0.5 - 1000;
                  const t = Settings.BOARD_UNITS * 0.5 - 400;

                  const r = Settings.BOARD_UNITS * 0.5 - 1000 + 64 * 14;
                  const b = t - 64 * 11;

                  const minChunkX = Math.floor(l / Settings.CHUNK_UNITS);
                  const maxChunkX = Math.floor(r / Settings.CHUNK_UNITS);
                  const minChunkY = Math.floor(b / Settings.CHUNK_UNITS);
                  const maxChunkY = Math.floor(t / Settings.CHUNK_UNITS);
                  for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
                     for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
                        const chunk = layer.getChunk(chunkX, chunkY);
                        for (const entity of chunk.entities) {
                           const type = getEntityType(entity);
                           if (type === EntityType.tree || type === EntityType.cow) {
                              destroyEntity(entity);
                           }
                        }
                     }
                  }

                  // KILL em!
                  
                  let topRow = [];
                  for (let i = 0; i < 15; i++) {
                     const x = l + i * 64;
                     const y = t;

                     const lastE = topRow[i - 1];
                     const connections = new Array<StructureConnection>();
                     if (i > 0) {
                        connections.push({
                           entity: lastE,
                           relativeOffsetDirection: Math.PI * 3/2
                        })
                     }
                     
                     const config = createFenceConfig(new Point(x, y), 0, tribe, connections, null);
                     const e = createEntity(config, layer, 0);
                     topRow.push(e);
                  }

                  // left
                  const leftRow = [];
                  for (let i = 0; i < 10; i++) {
                     const x = l;
                     const y = t - 64 * (i + 1);

                     const connections = new Array<StructureConnection>();
                     if (i > 0) {
                        const lastE = leftRow[i - 1];
                        connections.push({
                           entity: lastE,
                           relativeOffsetDirection: Math.PI * 0
                        })
                     } else {
                        const firstTopE = topRow[0];
                        connections.push({
                           entity: firstTopE,
                           relativeOffsetDirection: Math.PI * 0
                        })
                     }
                     
                     const config = createFenceConfig(new Point(x, y), 0, tribe, connections, null);
                     const e = createEntity(config, layer, 0);
                     leftRow.push(e);
                  }

                  // bottom
                  const bottomRow = [];
                  for (let i = 0; i < 11; i++) {
                     const x = l + 64 * (i + 1);
                     const y = t - 64 * 10;

                     const connections = new Array<StructureConnection>();
                     if (i > 0) {
                        const lastE = bottomRow[i - 1];
                        connections.push({
                           entity: lastE,
                           relativeOffsetDirection: Math.PI * 3/2
                        })
                     } else {
                        const lastLeftE = leftRow[leftRow.length - 1];
                        connections.push({
                           entity: lastLeftE,
                           relativeOffsetDirection: Math.PI * 3/2
                        })
                     }
                     
                     const config = createFenceConfig(new Point(x, y), 0, tribe, connections, null);
                     const e = createEntity(config, layer, 0);
                     bottomRow.push(e);
                  }

                  // bottom walls
                  for (let i = 0; i < 3; i++) {
                     const x = l + 64 * 11 + 64 * (i + 1);
                     const y = t - 64 * 10;

                     const connections = new Array<StructureConnection>();
                     if (i === 0) {
                        const lastBottom = bottomRow[bottomRow.length - 1];
                        connections.push({
                           entity: lastBottom,
                           relativeOffsetDirection: Math.PI * 3/2
                        })
                     }
                     
                     const config = createWallConfig(new Point(x, y), 0, tribe, BuildingMaterial.wood, connections, null);
                     const e = createEntity(config, layer, 0);
                  }

                  // right
                  const rightRow = [];
                  for (let i = 0; i < 6; i++) {
                     const x = l + 64 * 12;
                     const y = t - 64 - 64 * (i);

                     const connections = new Array<StructureConnection>();
                     if (i > 0) {
                        const lastE = rightRow[i - 1];
                        connections.push({
                           entity: lastE,
                           relativeOffsetDirection: 0
                        })
                     } else {
                        const topE = topRow[12];
                        connections.push({
                           entity: topE,
                           relativeOffsetDirection: 0
                        })
                     }
                     
                     if (i === 0) {
                        const config = createFenceGateConfig(new Point(x, y), Math.PI * 3/2, tribe, connections, null);
                        const e = createEntity(config, layer, 0);
                        rightRow.push(e);
                     } else {
                        const config = createFenceConfig(new Point(x, y), 0, tribe, connections, null);
                        const e = createEntity(config, layer, 0);
                        rightRow.push(e);
                     }
                  }

                  // left walls
                  for (let i = 0; i < 3; i++) {
                     const x = l + 64 * 12;
                     const y = t - 64 * 10 + 64 + 64 * i;
                     
                     if (i === 0) {
                        const config = createEmbrasureConfig(new Point(x - 32 + 10, y), Math.PI * 3/2, tribe, BuildingMaterial.wood, [], null);
                        const e = createEntity(config, layer, 0);
                     } else {
                        const connections = new Array<StructureConnection>();
                        if (i === 2) {
                           const rightFencesE = rightRow[rightRow.length - 1];
                           connections.push({
                              entity: rightFencesE,
                              relativeOffsetDirection: 0
                           });
                        }
                        
                        const config = createWallConfig(new Point(x, y), 0, tribe, BuildingMaterial.wood, connections, null);
                        const e = createEntity(config, layer, 0);
                     }
                  }

                  // right walls
                  for (let i = 0; i < 3; i++) {
                     const x = l + 64 * 14;
                     const y = t - 64 * 10 + 64 + 64 * i;
                     
                     const config = createWallConfig(new Point(x, y), 0, tribe, BuildingMaterial.wood, [], null);
                     const e = createEntity(config, layer, 0);
                  }

                  // door
                  {
                     const x = l + 64 * 13;
                     const y = t - 64 * 10 + 64 + 64 * 2;
                     
                     const config = createDoorConfig(new Point(x, y), 0, tribe, BuildingMaterial.wood, [], null);
                     const e = createEntity(config, layer, 0);
                  }

                  // weird fences
                  const weirdFences = new Array<Entity>();
                  for (let i = 0; i < 2; i++) {
                     const x = l + 64 * 12 + 64 * (i + 1)
                     const y = t - 64 - 64;
                     
                     const connections = new Array<StructureConnection>();
                     if (i === 1) {
                        const lastE = weirdFences[i - 1];
                        connections.push({
                           entity: lastE,
                           relativeOffsetDirection: Math.PI * 3/2
                        })
                     } else {
                        const fence = rightRow[1];
                        connections.push({
                           entity: fence,
                           relativeOffsetDirection: Math.PI * 3/2
                        })
                     }
                     
                     const config = createFenceConfig(new Point(x, y), 0, tribe, connections, null);
                     const e = createEntity(config, layer, 0);
                     weirdFences.push(e);
                  }

                  // other fence gate
                  {
                     const x = l + 64 * 14
                     const y = t - 64;

                     const connections = new Array<StructureConnection>();
                     connections.push({
                        entity: topRow[topRow.length - 1],
                        relativeOffsetDirection: 0
                     })
                     connections.push({
                        entity: weirdFences[weirdFences.length - 1],
                        relativeOffsetDirection: Math.PI
                     })
                     
                     const config = createFenceGateConfig(new Point(x, y), Math.PI * 3/2, tribe, connections, null);
                     const e = createEntity(config, layer, 0);
                  }

                  // inside fences
                  const insideEs = new Array<Entity>();
                  for (let i = 9; i >= 1; i--) {
                     const x = l + 64 + 64 * (i + 1)
                     const y = t - 64 - 64;
                     
                     const connections = new Array<StructureConnection>();
                     if (insideEs.length > 0) {
                        const lastE = insideEs[insideEs.length - 1];
                        connections.push({
                           entity: lastE,
                           relativeOffsetDirection: Math.PI * 1/2
                        })
                     } else {
                        const fence = rightRow[1];
                        connections.push({
                           entity: fence,
                           relativeOffsetDirection: Math.PI * 1/2
                        })
                     }
                     
                     const config = createFenceConfig(new Point(x, y), 0, tribe, connections, null);
                     const e = createEntity(config, layer, 0);
                     insideEs.push(e);
                  }

                  const cowNums = new Array<number>();
                  for (let i = 1; i <= 140; i++) {
                     const idx = Math.floor(Math.random() * cowNums.length);
                     cowNums.splice(idx, 0, i);
                  }

                  // spawn in cows
                  const padding = 10;
                  const minCowX = 3160 + padding - Settings.BOARD_UNITS * 0.5;
                  const maxCowX = 3800 - padding - Settings.BOARD_UNITS * 0.5;
                  const minCowY = 3120 + padding - Settings.BOARD_UNITS * 0.5;
                  const maxCowY = 3630 - padding - Settings.BOARD_UNITS * 0.5;
                  // const maxCowY = 3630 - padding - 64 - 64;

                  const width = Math.floor(11 * 1.35);
                  const height = Math.floor(9 * 1.35);
                  // const height = Math.floor(7 * 1.35);
                  if(1+1===3) {
                     for (let j = 0; j < height; j++) {
                        if (j === height - 2 || j === height - 3) {
                           continue;
                        }

                        const y = lerp(minCowY, maxCowY, j / (height - 1));

                        // const truWidth = j === height - 1 ? Math.floor(width * 0.5) : width;
                        const truWidth = width;
                        for (let i = 0; i < truWidth; i++) {
                           const x = lerp(minCowX, maxCowX, i / (width - 1));

                           const colour = ((i * 34653465) + (j * 123474329847)) % 2;
                           
                           const cowNum = cowNums.pop()!;
                           
                           const config = createCowConfig(new Point(x, y), randAngle(), colour);
                           config.components[ServerComponentType.taming]!.name = cowNum.toString();
                           const e = createEntity(config, layer, 0);
                        }
                     }
                  }

                  // Final num is 134. so one after should be 135

                  // const outsideCowConfig = createCowConfig(new Point(r + 400, b), 0, CowSpecies.brown);
                  // const outsideCowConfig = createCowConfig(new Point(l + 300, b + 200), 0, CowSpecies.brown);
                  // outsideCowConfig.components[ServerComponentType.taming]!.name = "135";
                  // createEntity(outsideCowConfig, layer, 0);



                  // @SQUEAM for the last tuft of grass shot

                  // const cow6 = createCowConfig(new Point(1596, 1072), Math.PI * 1.4, CowSpecies.brown);
                  // cow33.components[ServerComponentType.taming]!.name = "33";
                  // cow33.components[ServerComponentType.cow]!.bowelFullness = 1;
                  // createEntity(cow33, layer, 0);

                  const cow7 = createCowConfig(new Point(1410, 1129), Math.PI * 0.9, CowSpecies.brown);
                  cow7.components[ServerComponentType.taming]!.name = "7";
                  cow7.components[ServerComponentType.cow]!.bowelFullness = 1;
                  cow7.components[ServerComponentType.transform]!.hitboxes[1].box.relativeAngle = Math.PI * -0.1;
                  cow7.components[ServerComponentType.transform]!.hitboxes[1].previousRelativeAngle = Math.PI * -0.1;
                  createEntity(cow7, layer, 0);

                  // setTimeout(() => {

                  //    const cow27 = createCowConfig(new Point(1561, 1215), Math.PI * 0.8, CowSpecies.brown);
                  //    cow27.components[ServerComponentType.taming]!.name = "27";
                  //    cow27.components[ServerComponentType.cow]!.bowelFullness = 0;
                  //    createEntity(cow27, layer, 0);
                  // }, 2000);



                  {
                     const padding = -15;
                     const l = 1052 - padding;
                     const t = 1641 + padding;
                     const r = 1817 + padding;
                     const b = 1010 - padding;

                     for (let i = 0; i < 100; i++) {
                        const x = randFloat(l, r);
                        const y = randFloat(b, t);

                        if (x >= 1627 && y <= 1214) {
                           continue;
                        }
                        
                        let itemType: ItemType;
                        if (Math.random() < 0.2) {
                           itemType = ItemType.poop
                        } else if (Math.random() < 0.65) {
                           itemType = ItemType.raw_beef
                        } else {
                           itemType = ItemType.leather;
                        }
                        
                        const config = createItemEntityConfig(new Point(x, y), randAngle(), itemType, 1, null);
                        createEntity(config, layer, 1);
                     }
                  }

                  const newLeft = l;
                  const newRight = 1815;
                  const newTop = t;
                  const newBottom = 1009;
                  const dirtPadding = 40;

                  const save = new Point(1788, 1076);
                  
                  // create the dirt
                  for (let i = 0; i < 6000; i++) {
                     const x = randFloat(newLeft - dirtPadding, newRight + dirtPadding);
                     const y = randFloat(newBottom - dirtPadding, newTop + dirtPadding);

                     if (x < newLeft || x > newRight || y < newBottom || y > newTop) {
                        if (Math.random() < 0.8) {
                           continue;
                        }
                     }

                     const blockAmount = randFloat(0.6, 0.9);
                     const position = new Point(x, y);
         
                     const blockerBox = new CircularBox(position, new Point(0, 0), 0, randFloat(12, 18));
         
                     if (position.distanceTo(save) < blockerBox.radius + 10) {
                        continue;
                     }

                     createGrassBlocker(blockerBox, layer, blockAmount, blockAmount, 0);

                     // @SQUEAM
                     // Kill all grass blades on the blocker
                     const minChunkX = unitsToChunksClamped(blockerBox.calculateBoundsMinX());
                     const maxChunkX = unitsToChunksClamped(blockerBox.calculateBoundsMaxX());
                     const minChunkY = unitsToChunksClamped(blockerBox.calculateBoundsMinY());
                     const maxChunkY = unitsToChunksClamped(blockerBox.calculateBoundsMaxY());
                     for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
                        for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
                           const chunk = layer.getChunk(chunkX, chunkY);
         
                           for (const entity of chunk.entities) {
                              if (getEntityType(entity) === EntityType.grassStrand) {
                                 const grassTransformComponent = TransformComponentArray.getComponent(entity);
                                 const grassHitbox = grassTransformComponent.hitboxes[0];
                                 if (blockerBox.isColliding(grassHitbox.box)) {
                                    destroyEntity(entity);
                                 }
                              }
                           }
                        }
                     }
                  }

                  {
                     const left = 1048;
                     const right = 1810;
                     const top = 986;
                     const bottom = 935;

                     for (let i = 0; i < 40; i++) {
                        const vert = 1 - Math.pow(Math.random(), 2)
                        const hori = smoothstep(Math.random());

                        const x = lerp(left, right, hori);
                        const y = lerp(bottom, top, vert);
                        const config = createItemEntityConfig(new Point(x, y), randAngle(), Math.random() < 2/3 ? ItemType.raw_beef : ItemType.leather, 1, null)
                        createEntity(config, layer, 0);
                     };
                  }
                  {
                     const left = 1048;
                     const right = 1810;
                     const top = 956 - 30;
                     const bottom = 860 - 30;

                     for (let i = 0; i < 100; i++) {
                        const vert = 1 - Math.pow(Math.random(), 2)
                        const hori = smoothstep(Math.random());

                        const x = lerp(left, right, hori);
                        const y = lerp(bottom, top, vert);
                        const config = createItemEntityConfig(new Point(x, y), randAngle(), ItemType.poop, 1, null)
                        createEntity(config, layer, 0);
                     };
                  }

                  {
                     const top = 1520;
                     const bottom = 930;
                     const left = 975;
                     const right = 1025;

                     for (let i = 0; i < 30; i++) {
                        const hori = 1 - Math.pow(Math.random(), 2)
                        const vert = Math.random();

                        const x = lerp(left, right, hori);
                        const y = lerp(bottom, top, vert);
                        const config = createItemEntityConfig(new Point(x, y), randAngle(), Math.random() < 2/3 ? ItemType.raw_beef : ItemType.leather, 1, null)
                        createEntity(config, layer, 0);
                     }
                  }

                  {
                     const top = 1520;
                     const bottom = 930;
                     const left = 860;
                     const right = 994;

                     for (let i = 0; i < 78; i++) {
                        const hori = 1 - Math.pow(Math.random(), 2)
                        const vert = Math.random();

                        const x = lerp(left, right, hori);
                        const y = lerp(bottom, top, vert);
                        const config = createItemEntityConfig(new Point(x, y), randAngle(), ItemType.poop, 1, null)
                        createEntity(config, layer, 0);
                     }
                  }

                  for (let i = 0; i < 14; i++) {
                     const itemType = i === 0 ? ItemType.raw_beef : ItemType.poop;
                     const config = createItemEntityConfig(new Point(1866, 1076), randAngle(), itemType, 1, null)
                     createEntity(config, layer, 0);
                  }

                  // 
                  // Copied shit
                  // 

                  let config = createTreeConfig(new Point(817, 1355), Math.PI * 1.2, TreeSize.large);
                  createEntity(config, layer, 0);
                  config = createTreeConfig(new Point(817 - 200, 1355 - 64), Math.PI * 1.2, TreeSize.small);
                  createEntity(config, layer, 0);
                  
                  config = createTreeConfig(new Point(712, 1773), -Math.PI * 0.4, TreeSize.large);
                  createEntity(config, layer, 0);
                  
                  config = createTreeConfig(new Point(2225, 1855), -Math.PI * 0.4, TreeSize.large);
                  createEntity(config, layer, 0);
                  
                  // center right tree
                  config = createTreeConfig(new Point(2186, 1401), Math.PI * 1.1, TreeSize.large);
                  createEntity(config, layer, 0);
                  config = createDecorationConfig(new Point(2186 + 28, 1401 - 68), -Math.PI * 0.2, DecorationType.pebble);
                  createEntity(config, layer, 0);
                  config = createDecorationConfig(new Point(2186 - 72, 1401 - 42), -Math.PI * 0.4, DecorationType.pebble);
                  createEntity(config, layer, 0);
                  config = createDecorationConfig(new Point(2186 - 72 - 118, 1401 - 42 + 118), -Math.PI * 0.4, DecorationType.pebble);
                  createEntity(config, layer, 0);
                  config = createDecorationConfig(new Point(1835, 1666), Math.PI * 0.06, DecorationType.pebble);
                  createEntity(config, layer, 0);
                  config = createDecorationConfig(new Point(2059, 1122), Math.PI * 0.06, DecorationType.pebble);
                  createEntity(config, layer, 0);
                  
                  config = createTreeConfig(new Point(2146, 923), Math.PI, TreeSize.large);
                  createEntity(config, layer, 0);
                  
                  config = createDecorationConfig(new Point(2175, 843), -Math.PI * 0.4, DecorationType.flower3);
                  createEntity(config, layer, 0);
                  
                  config = createDecorationConfig(new Point(1927, 859), Math.PI * 0.05, DecorationType.rock);
                  createEntity(config, layer, 0);
                  
                  config = createDecorationConfig(new Point(1927 + 20, 859 - 10), Math.PI * 0.1, DecorationType.rock);
                  createEntity(config, layer, 0);

                  // const configs = createInguYetuksnoglurblidokowfleaConfig(new Point(Settings.BOARD_UNITS * 0.5 + 200, Settings.BOARD_UNITS * 0.5 - 500 - 300 + 100), 0);
                  // for (const config of configs) {
                  //    createEntity(config, surfaceLayer, 0);
                  // }

                  if (1+1===2)return;
                  
               // // const trib = new Tribe(TribeType.plainspeople, false, spawnPosition.copy());

                  const tukConfig = createTukmokConfig(new Point(spawnPosition.x + 150, spawnPosition.y - 50), Math.PI * 1.25);
                  for (const c of tukConfig) {
                     createEntity(c, layer, 0);
                  }

               //    setTimeout(() => {
               //    }, 100)

               //    setTimeout(() => {
               //       const pos3 = spawnPosition.copy();
               //       pos3.x -= 150;
               //       const t3 = createTribeWorkerConfig(pos3, 0, tribe);
               //       createEntity(t3, layer, 0);
               //    }, 316)

               //    setTimeout(() => {
               //       const pos4 = spawnPosition.copy();
               //       pos4.x -= 200;
               //       const t4 = createTribeWorkerConfig(pos4, 0, tribe);
               //       createEntity(t4, layer, 0);
               //    }, 602)

                  setTimeout(() => {
                     const p = spawnPosition.copy();
                     p.y -= 300;
                     const tribe = new Tribe(TribeType.barbarians, false, p);
                     
                     const pos2 = p.copy();
                     pos2.x -= 100;
                     pos2.y += randFloat(-30, 30);
                     const t2 = createTribeWorkerConfig(pos2, 0, tribe);
                     createEntity(t2, layer, 0);

                     setTimeout(() => {
                        const pos3 = p.copy();
                        pos3.x += 375;
                        pos3.y -= 80;
                        pos3.y -= randFloat(-30, 30);
                        const t3 = createTribeWorkerConfig(pos3, 0, tribe);
                        createEntity(t3, layer, 0);
                     }, 4000)
                  }, 5000);
               }, 6000);
               
               addPlayerClient(playerClient, surfaceLayer, spawnPosition);

               return;
            }

            if (typeof playerClient === "undefined") {
               return;
            }
            
            switch (packetType) {
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
               case PacketType.pickUpEntity: {
                  processPickUpEntityPacket(playerClient, reader);
                  break;
               }
               case PacketType.modifyBuilding: {
                  processModifyBuildingPacket(playerClient, reader);
                  break;
               }
               case PacketType.setMoveTargetPosition: {
                  processSetMoveTargetPositionPacket(playerClient, reader);
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
               case PacketType.completeTamingTier: {
                  processCompleteTamingTierPacket(playerClient, reader);
                  break;
               }
               case PacketType.forceCompleteTamingTier: {
                  processForceCompleteTamingTierPacket(playerClient, reader);
                  break;
               }
               case PacketType.acquireTamingSkill: {
                  processAcquireTamingSkillPacket(playerClient, reader);
                  break;
               }
               case PacketType.forceAcquireTamingSkill: {
                  processForceAcquireTamingSkillPacket(playerClient, reader);
                  break;
               }
               case PacketType.setSpectatingPosition: {
                  processSetSpectatingPositionPacket(playerClient, reader);
                  break;
               }
               case PacketType.devSetViewedSpawnDistribution: {
                  processDevSetViewedSpawnDistribution(playerClient, reader);
                  break;
               }
               case PacketType.setSignMessage: {
                  processSetSignMessagePacket(reader);
                  break;
               }
               case PacketType.renameAnimal: {
                  processRenameAnimalPacket(reader);
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
      pushEntityJoinBuffer(false);
      preDestroyFlaggedEntities();
      destroyFlaggedEntities();

      if (SERVER.isSimulating) {
         updateTribes();
         
         updateGrassBlockers();
         runCollapses();

         updateWind();
         
         tickEntities();
         applyTethers();
         updateDynamicPathfindingNodes();

         for (const layer of layers) {
            resolveEntityCollisions(layer);
         }
         
         // if (getGameTicks() % Settings.TPS === 0) {
            // @Incomplete
            // updateResourceDistributions();
            runSpawnAttempt();
         // }

         // @Bug @Incomplete: Called twice!!!!
         updateTribes();
         
         pushEntityJoinBuffer(true);
      }
      preDestroyFlaggedEntities();

      SERVER.sendGameDataPackets();

      destroyFlaggedEntities();

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
            const hitbox = transformComponent.hitboxes[0];
            playerClient.updatePosition(hitbox.box.position.x, hitbox.box.position.y);

            playerClient.lastLayer = getEntityLayer(viewedEntity);
         }
      
         const visibleEntities = getPlayerVisibleEntities(playerClient);
         
         const entitiesToSend = new Set<Entity>();

         // Always send the viewed entity (if alive)
         if (entityExists(viewedEntity)) {
            entitiesToSend.add(viewedEntity);
         }
         // Also always add the player instance. This is so that the player instance can fly far away from the spectated entity and not make the client die
         if (entityExists(playerClient.instance)) {
            entitiesToSend.add(playerClient.instance);
         }
         const removedEntities = new Array<Entity>();

         // Add newly visible entities
         for (const entity of visibleEntities) {
            if (!playerClient.visibleEntities.has(entity)) {
               entitiesToSend.add(entity);
            }
         }

         // Add removed entities
         for (const entity of playerClient.visibleEntities) {
            if (!visibleEntities.has(entity)) {
               removedEntities.push(entity);
            }
         }

         // Send dirty entities
         for (const entity of playerClient.visibleDirtiedEntities) {
            // Sometimes entities are simultaneously removed from the board and on the visible dirtied list, this catches that
            if (entityExists(entity)) {
               entitiesToSend.add(entity);
            }
         }
         
         // Send the game data to the player
         const gameDataPacket = createGameDataPacket(playerClient, entitiesToSend, removedEntities);
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