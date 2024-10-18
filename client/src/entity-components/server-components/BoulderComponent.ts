import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";

export interface BoulderComponentParams {
   readonly boulderType: number;
}

export interface BoulderComponent {
   readonly boulderType: number;
}

export const BoulderComponentArray = new ServerComponentArray<BoulderComponent, BoulderComponentParams, never>(ServerComponentType.boulder, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): BoulderComponentParams {
   const boulderType = reader.readNumber();
   return {
      boulderType: boulderType
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.boulder>): BoulderComponent {
   return {
      boulderType: entityConfig.components[ServerComponentType.boulder].boulderType
   };
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}