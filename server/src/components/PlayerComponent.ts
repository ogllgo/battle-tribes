import { TribesmanTitle } from "battletribes-shared/titles";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { sendRespawnDataPacket } from "../server/packet-processing";
import PlayerClient from "../server/PlayerClient";

export class PlayerComponent {
   public readonly client: PlayerClient;
   
   /** ID of the tribesman the player is interacting with */
   public interactingEntityID = 0;

   public titleOffer: TribesmanTitle | null = null;

   constructor(playerClient: PlayerClient) {
      this.client = playerClient;
   }
}

export const PlayerComponentArray = new ComponentArray<PlayerComponent>(ServerComponentType.player, true, getDataLength, addDataToPacket);
PlayerComponentArray.onJoin = onJoin;
PlayerComponentArray.onRemove = onRemove;

function onJoin(player: Entity): void {
   const playerComponent = PlayerComponentArray.getComponent(player);
   const playerClient = playerComponent.client;

   if (playerClient !== null && !playerClient.isAlive) {
      sendRespawnDataPacket(playerClient);
      playerClient.isAlive = true;
   }
}

function onRemove(player: Entity): void {
   const playerComponent = PlayerComponentArray.getComponent(player);
   const playerClient = playerComponent.client;

   if (playerClient !== null) {
      playerClient.isAlive = false;
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT + 100;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const playerComponent = PlayerComponentArray.getComponent(entity);

   // @Hack: hardcoded
   packet.addString(playerComponent.client.username, 100);
}