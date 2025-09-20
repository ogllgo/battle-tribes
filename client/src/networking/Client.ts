import { BuildingPlanData, TribeWallData } from "battletribes-shared/ai-building-types";
import { distance } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { TechID } from "battletribes-shared/techs";
import { TribeType } from "battletribes-shared/tribes";
import { TribesmanTitle } from "battletribes-shared/titles";
import Game from "../Game";
import { Tile } from "../Tile";
import { gameScreenSetIsDead } from "../components/game/GameScreen";
import { definiteGameState, latencyGameState } from "../game-state/game-states";
import { windowHeight, windowWidth } from "../webgl";
import { closeCurrentMenu } from "../menus";
import { getStringLengthBytes, Packet, PacketReader, PacketType } from "battletribes-shared/packets";
import { processForcePositionUpdatePacket, processGameDataPacket, processInitialGameDataPacket, processSyncDataPacket } from "./packet-processing";
import { createActivatePacket, createPlayerDataPacket, createSyncRequestPacket, sendSetSpectatingPositionPacket } from "./packet-creation";
import { AppState } from "../components/App";
import { LoadingScreenStatus } from "../components/LoadingScreen";
import Board from "../Board";
import { setPlayerInstance, playerInstance } from "../player";

export type GameData = {
   readonly gameTicks: number;
   readonly tiles: Array<Array<Tile>>;
   readonly playerID: number;
}

let visibleWalls: ReadonlyArray<TribeWallData> = [];
let buildingPlans: ReadonlyArray<BuildingPlanData> = [];

let lastPacketTime = 0;

export function getLastPacketTime(): number {
   return lastPacketTime;
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

// @Cleanup: De-singleton-ify
abstract class Client {
   private static socket: WebSocket | null = null;

   public static initialGameDataResolve: (() => void) | null = null;
   public static nextGameDataResolve: ((value: PacketReader) => void) | null = null;

   public static connectToServer(setAppState: (appState: AppState) => void, setLoadingScreenStatus: (status: LoadingScreenStatus) => void): Promise<boolean> {
      return new Promise(resolve => {
         this.socket = new WebSocket(`ws://127.0.0.1:${Settings.SERVER_PORT}`);
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
                  
                  // queuedGameDataPackets.push(reader);
                  lastPacketTime = performance.now();

                  // Done before so that server data can override particles
                  Board.updateParticles();
                  
                  processGameDataPacket(reader);
                  
                  Board.tickEntities();

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
               // case PacketType.respawnData: {
               //    processRespawnDataPacket(reader);
               //    break;
               // }
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

   // @Incomplete
   public static sendChatMessage(message: string): void {
      // Send the chat message to the server
      if (this.socket !== null) {
         // this.socket.emit("chat_message", message);
      }
   }

   public static sendInitialPlayerData(username: string, tribeType: TribeType, isSpectating: boolean): void {
      // Send player data to the server
      if (this.socket !== null) {
         const packet = new Packet(PacketType.initialPlayerData, Float32Array.BYTES_PER_ELEMENT * 5 + getStringLengthBytes(username));
         packet.addString(username);
         packet.addNumber(tribeType);
         packet.addNumber(windowWidth);
         packet.addNumber(windowHeight);
         packet.addBoolean(isSpectating);
         packet.padOffset(3);

         this.socket.send(packet.buffer);
      }
   }

   public static sendPlayerDataPacket(): void {
      if (Game.isRunning && this.socket !== null) {
         if (playerInstance !== null) {
            const buffer = createPlayerDataPacket();
            this.socket.send(buffer);
         } else {
            sendSetSpectatingPositionPacket();
         }
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