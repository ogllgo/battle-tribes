import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData } from "../../world";

export interface CraftingStationComponentData {
   readonly craftingStation: CraftingStation;
}

export interface CraftingStationComponent {
   readonly craftingStation: CraftingStation;
}

export const CraftingStationComponentArray = new ServerComponentArray<CraftingStationComponent>(ServerComponentType.craftingStation, true, createComponent, getMaxRenderParts, decodeData);

export function createCraftingStationComponentData(craftingStation: CraftingStation): CraftingStationComponentData {
   return {
      craftingStation: craftingStation
   };
}

function decodeData(reader: PacketReader): CraftingStationComponentData {
   const craftingStation = reader.readNumber() as CraftingStation;
   return {
      craftingStation: craftingStation
   };
}

function createComponent(entityComponentData: EntityComponentData): CraftingStationComponent {
   return {
      craftingStation: entityComponentData.serverComponentData[ServerComponentType.craftingStation]!.craftingStation
   };
}

function getMaxRenderParts(): number {
   return 0;
}