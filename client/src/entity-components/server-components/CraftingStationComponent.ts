import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityConfig } from "../ComponentArray";

export interface CraftingStationComponentParams {
   readonly craftingStation: CraftingStation;
}

export interface CraftingStationComponent {
   readonly craftingStation: CraftingStation;
}

export const CraftingStationComponentArray = new ServerComponentArray<CraftingStationComponent>(ServerComponentType.craftingStation, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): CraftingStationComponentParams {
   const craftingStation = reader.readNumber() as CraftingStation;
   return {
      craftingStation: craftingStation
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.craftingStation, never>): CraftingStationComponent {
   return {
      craftingStation: entityConfig.serverComponents[ServerComponentType.craftingStation].craftingStation
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}