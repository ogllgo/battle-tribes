import { BuildingPlanData, PotentialBuildingPlanData, TribeWallData } from "battletribes-shared/ai-building-types";
import { CircularHitboxData, GameDataPacket, HitFlags, RectangularHitboxData, ServerTileUpdateData } from "battletribes-shared/client-server-types";
import { distance, Point, randFloat } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { TechID } from "battletribes-shared/techs";
import { STRUCTURE_TYPES } from "battletribes-shared/structures";
import { TribeType } from "battletribes-shared/tribes";
import { TribesmanTitle } from "battletribes-shared/titles";
import Game from "../Game";
import { Tile } from "../Tile";
import { gameScreenSetIsDead } from "../components/game/GameScreen";
import { HealthBar_setHasFrostShield } from "../components/game/HealthBar";
import Camera from "../Camera";
import { updateRenderChunkFromTileUpdate } from "../rendering/render-chunks";
import { definiteGameState, latencyGameState } from "../game-state/game-states";
import { createDamageNumber, createHealNumber } from "../text-canvas";
import { playSound } from "../sound";
import { setVisibleRestrictedBuildingAreas } from "../rendering/webgl/restricted-building-areas-rendering";
import { setVisibleWallConnections } from "../rendering/webgl/wall-connection-rendering";
import { Infocards_setTitleOffer } from "../components/game/infocards/Infocards";
import { GrassBlocker } from "battletribes-shared/grass-blockers";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { windowHeight, windowWidth } from "../webgl";
import { closeCurrentMenu } from "../menus";
import { TribesTab_refresh } from "../components/game/dev/tabs/TribesTab";
import { processTickEvents } from "../entity-tick-events";
import { getStringLengthBytes, Packet, PacketReader, PacketType } from "battletribes-shared/packets";
import { processForcePositionUpdatePacket, processInitialGameDataPacket, processRespawnDataPacket, processSyncDataPacket } from "./packet-processing";
import { createActivatePacket, createPlayerDataPacket, createSyncRequestPacket } from "./packet-creation";
import { createHitbox, Hitbox } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { AppState } from "../components/App";
import { LoadingScreenStatus } from "../components/LoadingScreen";
import { entityExists, getEntityLayer, getEntityType, layers, playerInstance, removeEntity, setPlayerInstance } from "../world";
import { getTileIndexIncludingEdges } from "../Layer";
import { PhysicsComponentArray } from "../entity-components/server-components/PhysicsComponent";
import { getComponentArrays } from "../entity-components/ComponentArray";
import { getRandomPositionInEntity, TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { createHealingParticle, createSlimePoolParticle, createSparkParticle } from "../particles";

export type GameData = {
   readonly gameTicks: number;
   readonly tiles: Array<Array<Tile>>;
   readonly playerID: number;
}

let visibleWalls: ReadonlyArray<TribeWallData>;
let buildingPlans: ReadonlyArray<BuildingPlanData>;

let queuedGameDataPackets = new Array<PacketReader>();

// @Cleanup: location
// Use prime numbers / 100 to ensure a decent distribution of different types of particles
const HEALING_PARTICLE_AMOUNTS = [0.05, 0.37, 1.01];

export function getQueuedGameDataPackets(): Array<PacketReader> {
   return queuedGameDataPackets;
}

export function getVisibleWalls(): ReadonlyArray<TribeWallData> {
   return visibleWalls;
}

export function getVisibleBuildingPlans(): ReadonlyArray<BuildingPlanData> {
   return buildingPlans;
}

export function getHoveredBuildingPlan(): BuildingPlanData | null {
   if (Game.cursorX === null || Game.cursorY === null) {
      return null;
   }
   
   let minDist = 64;
   let closestPlanToCursor: BuildingPlanData | null = null;
   for (let i = 0; i < buildingPlans.length; i++) {
      const plan = buildingPlans[i];
      
      const cursorDist = distance(plan.x, plan.y, Game.cursorX, Game.cursorY);
      if (cursorDist < minDist) {
         minDist = cursorDist;
         closestPlanToCursor = plan;
      }
   }

   return closestPlanToCursor;
}

// @Cleanup
let grassBlockers: ReadonlyArray<GrassBlocker>;
export function getGrassBlockers(): ReadonlyArray<GrassBlocker> {
   return grassBlockers;
}

// @Cleanup: put these 2 in a more appropriate file

export function createCircularHitboxFromData(data: CircularHitboxData): Hitbox {
   const offset = new Point(data.offsetX, data.offsetY);
   const box = new CircularBox(offset, 0, data.radius);
   box.scale = data.scale;
   return createHitbox(box, data.mass, data.collisionType, data.collisionBit, data.collisionMask, data.flags);
}

export function createRectangularHitboxFromData(data: RectangularHitboxData): Hitbox {
   const offset = new Point(data.offsetX, data.offsetY);
   const box = new RectangularBox(offset, data.width, data.height, data.rotation);
   box.scale = data.scale;
   return createHitbox(box, data.mass, data.collisionType, data.collisionBit, data.collisionMask, data.flags);
}

// @Cleanup: De-singleton-ify
abstract class Client {
   private static socket: WebSocket | null = null;

   public static initialGameDataResolve: (() => void) | null = null;
   public static nextGameDataResolve: ((value: PacketReader) => void) | null = null;

   public static connectToServer(setAppState: (appState: AppState) => void, setLoadingScreenStatus: (status: LoadingScreenStatus) => void): Promise<boolean> {
      return new Promise(resolve => {
         // this.socket = new WebSocket(`ws://10.0.0.15:${Settings.SERVER_PORT}`);
         this.socket = new WebSocket(`ws://localhost:${Settings.SERVER_PORT}`);
         this.socket.binaryType = "arraybuffer";

         this.socket.onopen = () => {
            resolve(true);
         }

         // When the connection to the server fails
         this.socket.onclose = () => {
            // @Incomplete
            // // Don't show a connection error if the socket was disconnected manually
            // if (disconnectReason === "io client disconnect") return;

            Game.isRunning = false;
            
            setLoadingScreenStatus(LoadingScreenStatus.connectionError);
            setAppState(AppState.loading);

            setPlayerInstance(null);
         }

         this.socket.onmessage = (message): void => {
            const reader = new PacketReader(message.data, 0);
            
            const packetType = reader.readNumber() as PacketType;
            switch (packetType) {
               case PacketType.initialGameData: {
                  // @Hack
                  if (this.initialGameDataResolve !== null) {
                     processInitialGameDataPacket(reader);
                     this.initialGameDataResolve();
                     this.initialGameDataResolve = null;
                  }
                  break;
               }
               case PacketType.gameData: {
                  if (this.nextGameDataResolve !== null) {
                     this.nextGameDataResolve(reader);
                     this.nextGameDataResolve = null;
                     return;
                  }

                  // Only unload game packets when the game is running
                  if (!Game.isRunning || !Game.isSynced || document.visibilityState === "hidden") {
                     return;
                  }

                  queuedGameDataPackets.push(reader);

                  break;
               }
               case PacketType.syncData: {
                  processSyncDataPacket(reader);
                  break;
               }
               case PacketType.sync: {
                  Game.sync();
                  break;
               }
               case PacketType.respawnData: {
                  processRespawnDataPacket(reader);
                  break;
               }
               case PacketType.forcePositionUpdate: {
                  processForcePositionUpdatePacket(reader);
                  break;
               }
            }
         }

         // let socketAlreadyExists = false;

         // // Don't add events if the socket already exists
         // if (this.socket !== null) {
         //    socketAlreadyExists = true;
            
         //    // Reconnect
         //    if (!this.socket.connected) {
         //       this.socket.connect();
         //    }

         //    this.socket.off("connect");
         //    this.socket.off("connect_error");
         // } else {
         //    // Create the socket
         //    this.socket = this.createSocket();
         //    this.socket.connect();
         // }

         // // If connection was successful, return true
         // this.socket.on("connect", () => {
         //    resolve(true);
         // });
         // // If couldn't connect to server, return false
         // this.socket.on("connect_error", (err) => {
         //    console.log(err);
         //    resolve(false);
         // });
         
         // if (!socketAlreadyExists) {
         //    this.socket.on("game_data_packet", gameDataPacket => {
         //       // Only unload game packets when the game is running
         //       if (Game.getIsPaused() || !Game.isRunning || !Game.isSynced || document.visibilityState === "hidden") return;

         //       registerServerTick();

         //       Game.queuedPackets.push(gameDataPacket);
         //    });

         //    this.socket.on("game_data_sync_packet", (gameDataSyncPacket: GameDataSyncPacket) => {
         //       this.registerGameDataSyncPacket(gameDataSyncPacket);
         //    });

         // }
      });
   }

   // public static async requestInitialGameData(): Promise<InitialGameDataPacket> {
   //    return new Promise(resolve => {
   //       if (this.socket === null) throw new Error("Socket hadn't been created when requesting game data")

   //       this.socket.emit("initial_game_data_request");
         
   //       this.socket.off("initial_game_data_packet");
   //       this.socket.on("initial_game_data_packet", (initialGameDataPacket: InitialGameDataPacket) => {
   //          resolve(initialGameDataPacket);
   //       });
   //    });
   // }

   // @Hack
   public static getInitialGameDataPacket(): Promise<void> {
      return new Promise(resolve => {
         Client.initialGameDataResolve = resolve;
      });
   }

   // @Hack
   public static getNextGameDataPacket(): Promise<PacketReader> {
      return new Promise(resolve => {
         Client.nextGameDataResolve = resolve;
      })
   }

   public static disconnect(): void {
      if (this.socket === null) {
         throw new Error("Tried to disconnect a socket which doesn't exist");
      }

      this.socket.close();
      this.socket = null;
   }

   public static processGameDataPacket(gameDataPacket: GameDataPacket): void {
      // this.updateTribe(gameDataPacket.playerTribeData);
      // Game.enemyTribes = gameDataPacket.enemyTribesData;
      // @Hack: shouldn't do always
      TribesTab_refresh();

      Infocards_setTitleOffer(gameDataPacket.titleOffer);

      processTickEvents(gameDataPacket.tickEvents);

      // this.updateEntities(gameDataPacket.entityDataArray, gameDataPacket.visibleEntityDeathIDs);
      
      this.registerTileUpdates(gameDataPacket.tileUpdates);

      HealthBar_setHasFrostShield(gameDataPacket.hasFrostShield);

      // Register hits
      for (const hitData of gameDataPacket.visibleHits) {
         // Register hit
         const hitEntity = hitData.hitEntityID;
         if (entityExists(hitEntity)) {
            if (hitData.attackEffectiveness === AttackEffectiveness.stopped) {
               // Register stopped hit
                        
               const transformComponent = TransformComponentArray.getComponent(hitEntity);
               for (let i = 0; i < 6; i++) {
                  const position = transformComponent.position.offset(randFloat(0, 6), 2 * Math.PI * Math.random());
                  createSparkParticle(position.x, position.y);
               }
            } else {
               // Register hit

               // If the entity is hit by a flesh sword, create slime puddles
               if (hitData.flags & HitFlags.HIT_BY_FLESH_SWORD) {
                  const transformComponent = TransformComponentArray.getComponent(hitEntity);
                  for (let i = 0; i < 2; i++) {
                     createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, 32);
                  }
               }

               // @Incomplete @Hack
               if (hitData.flags & HitFlags.HIT_BY_SPIKES) {
                  playSound("spike-stab.mp3", 0.3, 1, Point.unpackage(hitData.hitPosition), getEntityLayer(hitEntity));
               }

               // @Speed
               const componentArrays = getComponentArrays();
               for (let i = 0; i < componentArrays.length; i++) {
                  const componentArray = componentArrays[i];
                  if (typeof componentArray.onHit !== "undefined" && componentArray.hasComponent(hitEntity)) {
                     componentArray.onHit(hitEntity, hitData);
                  }
               }
            }
         }

         if (hitData.damage > 0 && hitData.shouldShowDamageNumber) {
            createDamageNumber(hitData.hitPosition[0], hitData.hitPosition[1], hitData.damage);
         }
      }

      if (playerInstance !== null) {
         const physicsComponent = PhysicsComponentArray.getComponent(playerInstance);
         // Register player knockback
         for (let i = 0; i < gameDataPacket.playerKnockbacks.length; i++) {
            const knockbackData = gameDataPacket.playerKnockbacks[i];
            
            physicsComponent.selfVelocity.x *= 0.5;
            physicsComponent.selfVelocity.y *= 0.5;
   
            physicsComponent.selfVelocity.x += knockbackData.knockback * Math.sin(knockbackData.knockbackDirection);
            physicsComponent.selfVelocity.y += knockbackData.knockback * Math.cos(knockbackData.knockbackDirection);
         }
      }

      // Register heals
      for (const healData of gameDataPacket.heals) {
         if (healData.healAmount === 0) {
            continue;
         }

         if (healData.healerID === playerInstance) {
            createHealNumber(healData.healedID, healData.entityPositionX, healData.entityPositionY, healData.healAmount);
         }

         const healedEntity = healData.healedID;
         if (entityExists(healedEntity)) {
            const transformComponent = TransformComponentArray.getComponent(healedEntity);
      
            // Create healing particles depending on the amount the entity was healed
            let remainingHealing = healData.healAmount;
            for (let size = 2; size >= 0;) {
               if (remainingHealing >= HEALING_PARTICLE_AMOUNTS[size]) {
                  const position = getRandomPositionInEntity(transformComponent);
                  createHealingParticle(position, size);
                  remainingHealing -= HEALING_PARTICLE_AMOUNTS[size];
               } else {
                  size--;
               }
            }

            // @Hack @Incomplete: This will trigger the repair sound effect even if a hammer isn't the one healing the structure
            if (STRUCTURE_TYPES.includes(getEntityType(healedEntity) as any)) { // @Cleanup
               playSound("repair.mp3", 0.4, 1, new Point(healData.entityPositionX, healData.entityPositionY), getEntityLayer(healedEntity));
            }
         }
      }

      if (gameDataPacket.pickedUpItem) {
         playSound("item-pickup.mp3", 0.3, 1, Camera.position, null);
      }

      if (typeof gameDataPacket.hotbarCrossbowLoadProgressRecord !== "undefined") {
         definiteGameState.hotbarCrossbowLoadProgressRecord = gameDataPacket.hotbarCrossbowLoadProgressRecord;
      }

      setVisibleRestrictedBuildingAreas(gameDataPacket.visibleRestrictedBuildingAreas);
      setVisibleWallConnections(gameDataPacket.visibleWallConnections);

      buildingPlans = gameDataPacket.visibleBuildingPlans;
      visibleWalls = gameDataPacket.visibleWalls;
      grassBlockers = gameDataPacket.visibleGrassBlockers;
   }

   private static registerTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const tileUpdate of tileUpdates) {
         const layer = layers[tileUpdate.layerIdx];
         
         const tileX = tileUpdate.tileIndex % Settings.BOARD_DIMENSIONS;
         const tileY = Math.floor(tileUpdate.tileIndex / Settings.BOARD_DIMENSIONS);
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tile = layer.getTile(tileIndex);
         tile.type = tileUpdate.type;
         
         updateRenderChunkFromTileUpdate(tileUpdate);
      }
   }

   // @Incomplete
   public static sendChatMessage(message: string): void {
      // Send the chat message to the server
      if (this.socket !== null) {
         // this.socket.emit("chat_message", message);
      }
   }

   public static sendInitialPlayerData(username: string, tribeType: TribeType): void {
      // Send player data to the server
      if (this.socket !== null) {
         const packet = new Packet(PacketType.initialPlayerData, Float32Array.BYTES_PER_ELEMENT * 4 + getStringLengthBytes(username));
         packet.addString(username);
         packet.addNumber(tribeType);
         packet.addNumber(windowWidth);
         packet.addNumber(windowHeight);

         this.socket.send(packet.buffer);
      }
   }

   public static sendPlayerDataPacket(): void {
      if (Game.isRunning && this.socket !== null && playerInstance !== null) {
         const buffer = createPlayerDataPacket();
         this.socket.send(buffer);
      }
   }

   public static sendHeldItemDropPacket(dropAmount: number, dropDirection: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("held_item_drop", dropAmount, dropDirection);
      }
   }

   public static sendDeactivatePacket(): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("deactivate");
      }
   }

   public static sendActivatePacket(): void {
      if (this.socket !== null) {
         const buffer = createActivatePacket();
         this.socket.send(buffer);
      }
   }

   public static sendSyncRequestPacket(): void {
      if (Game.isRunning && this.socket !== null) {
         const buffer = createSyncRequestPacket();
         this.socket.send(buffer);
      }
   }

   public static sendCommand(command: string): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("command", command);
      }
   }

   public static killPlayer(): void {
      // Remove the player from the game
      removeEntity(playerInstance!, true);
      setPlayerInstance(null);

      latencyGameState.resetFlags();
      definiteGameState.resetFlags();

      gameScreenSetIsDead(true);
      closeCurrentMenu();
   }

   public static sendPacket(data: ArrayBuffer): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.send(data);
      }
   }

   public static sendForceUnlockTech(techID: TechID): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("force_unlock_tech", techID);
      }
   }

   // @Cleanup: either make this.socket always not null or use a decorator.

   public static sendModifyBuilding(structureID: number, data: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("modify_building", structureID, data);
      }
   }

   public static sendDeconstructBuilding(structureID: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("deconstruct_building", structureID);
      }
   }

   public static sendStructureUninteract(structureID: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("structure_uninteract", structureID);
      }
   }

   public static sendRecruitTribesman(tribesmanID: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("recruit_tribesman", tribesmanID);
      }
   }

   public static respondToTitleOffer(title: TribesmanTitle, isAccepted: boolean): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("respond_to_title_offer", title, isAccepted);
      }
   }

   public static sendDevGiveTitlePacket(title: TribesmanTitle): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("dev_give_title", title);
      }
   }

   public static sendDevRemoveTitlePacket(title: TribesmanTitle): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("dev_remove_title", title);
      }
   }

   public static sendDevCreateTribe(): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("dev_create_tribe");
      }
   }

   public static sendDevChangeTribeType(tribeID: number, newTribeType: TribeType): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("dev_change_tribe_type", tribeID, newTribeType);
      }
   }
}

export default Client;