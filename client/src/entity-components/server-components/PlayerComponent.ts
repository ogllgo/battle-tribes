import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityConfig } from "../ComponentArray";

export interface PlayerComponentParams {
   readonly username: string;
}

export interface PlayerComponent {
   readonly username: string;
}

export const PlayerComponentArray = new ServerComponentArray<PlayerComponent, PlayerComponentParams, never>(ServerComponentType.player, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): PlayerComponentParams {
   const username = reader.readString(100);
   return {
      username: username
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.player, never>): PlayerComponent {
   return {
      username: entityConfig.serverComponents[ServerComponentType.player].username
   };
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT + 100);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT + 100);
}