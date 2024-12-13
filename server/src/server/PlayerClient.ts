import { HitData, PlayerKnockbackData, HealData, ResearchOrbCompleteData, GameDataPacketOptions } from "battletribes-shared/client-server-types";
import Tribe from "../Tribe";
import { EntityTickEvent } from "battletribes-shared/entity-events";
import { Entity } from "battletribes-shared/entities";
import WebSocket from "ws";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import Layer from "../Layer";
import { TransformComponentArray } from "../components/TransformComponent";

export const enum PlayerClientVars {
   VIEW_PADDING = 128
}

class PlayerClient {
   public readonly username: string;
   public readonly socket: WebSocket;
   public readonly tribe: Tribe;
   public readonly isDev: boolean;

   /** The player's entity */
   public instance: Entity;
   /** The entity currently being viewed by the player. Typically the player instance. */
   public viewedEntity: Entity;
   public clientIsActive = false;
   public isAlive = true;

   // When the player is dead, we need to remember where their final position is so they can receive updates while dead
   public lastViewedPositionX = 0;
   public lastViewedPositionY = 0;
   /** The last layer that the player was viewing. */
   public lastLayer: Layer;
   public screenWidth: number;
   public screenHeight: number;

   public minVisibleX = 0;
   public maxVisibleX = 0;
   public minVisibleY = 0;
   public maxVisibleY = 0;

   public minVisibleChunkX = 0;
   public maxVisibleChunkX = 0;
   public minVisibleChunkY = 0;
   public maxVisibleChunkY = 0;

   /** All hits that have occured to any entity visible to the player */
   public visibleHits = new Array<HitData>();
   /** All knockbacks given to the player */
   public playerKnockbacks = new Array<PlayerKnockbackData>();
   /** All healing done to any entity visible to the player */
   public heals = new Array<HealData>();
   /** All entity tick events visible to the player */
   public entityTickEvents = new Array<EntityTickEvent>();
   
   public visibleEntityDeathIDs = new Array<number>();
   public orbCompletes = new Array<ResearchOrbCompleteData>();
   public hasPickedUpItem = false;
   public gameDataOptions = 0;

   public visibleEntities = new Set<Entity>();
   public visibleDirtiedEntities = new Array<Entity>();
   public visibleRemovedEntities = new Array<Entity>();

   constructor(socket: WebSocket, tribe: Tribe, layer: Layer, screenWidth: number, screenHeight: number, playerPosition: Point, instance: Entity, username: string, isDev: boolean) {
      this.socket = socket;
      this.tribe = tribe;
      this.lastLayer = layer;
      this.screenWidth = screenWidth;
      this.screenHeight = screenHeight;
      this.instance = instance;
      this.viewedEntity = instance;
      this.username = username;
      this.isDev = isDev;

      this._updateVisibleChunkBounds(playerPosition, screenWidth, screenHeight);
   }

   private _updateVisibleChunkBounds(playerPosition: Point, screenWidth: number, screenHeight: number): void {
      this.minVisibleX = playerPosition.x - screenWidth * 0.5 - PlayerClientVars.VIEW_PADDING;
      this.maxVisibleX = playerPosition.x + screenWidth * 0.5 + PlayerClientVars.VIEW_PADDING;
      this.minVisibleY = playerPosition.y - screenHeight * 0.5 - PlayerClientVars.VIEW_PADDING;
      this.maxVisibleY = playerPosition.y + screenHeight * 0.5 + PlayerClientVars.VIEW_PADDING;
      
      this.minVisibleChunkX = Math.max(Math.min(Math.floor(this.minVisibleX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      this.maxVisibleChunkX = Math.max(Math.min(Math.floor(this.maxVisibleX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      this.minVisibleChunkY = Math.max(Math.min(Math.floor(this.minVisibleY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      this.maxVisibleChunkY = Math.max(Math.min(Math.floor(this.maxVisibleY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   }

   public updateVisibleChunkBounds(): void {
      const transformComponent = TransformComponentArray.getComponent(this.instance);
      this._updateVisibleChunkBounds(transformComponent.position, this.screenWidth, this.screenHeight);
   }

   public hasPacketOption(packetOption: GameDataPacketOptions): boolean {
      return (this.gameDataOptions & packetOption) !== 0;
   }
}

export default PlayerClient;