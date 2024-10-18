import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";

export interface CraftingStationComponentParams {
   readonly craftingStation: CraftingStation;
}

export interface CraftingStationComponent {
   readonly craftingStation: CraftingStation;
}

export const CraftingStationComponentArray = new ServerComponentArray<CraftingStationComponent>(ServerComponentType.craftingStation, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): CraftingStationComponentParams {
   const craftingStation = reader.readNumber() as CraftingStation;
   return {
      craftingStation: craftingStation
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.craftingStation>): CraftingStationComponent {
   return {
      craftingStation: entityConfig.components[ServerComponentType.craftingStation].craftingStation
   };
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}