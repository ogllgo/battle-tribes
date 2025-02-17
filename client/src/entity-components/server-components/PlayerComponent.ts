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
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): PlayerComponentParams {
   const username = reader.readString();
   return {
      username: username
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.player, never>): PlayerComponent {
   return {
      username: entityConfig.serverComponents[ServerComponentType.player].username
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(reader: PacketReader): void {
   reader.padString();
}

function updateFromData(reader: PacketReader): void {
   reader.padString();
}