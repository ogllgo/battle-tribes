import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { Packet } from "battletribes-shared/packets";
import { Entity } from "battletribes-shared/entities";

export class CraftingStationComponent {
   public readonly craftingStation: CraftingStation;
   
   constructor(craftingStation: CraftingStation) {
      this.craftingStation = craftingStation;
   }
}

export const CraftingStationComponentArray = new ComponentArray<CraftingStationComponent>(ServerComponentType.craftingStation, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const craftingStationComponent = CraftingStationComponentArray.getComponent(entity);

   packet.writeNumber(craftingStationComponent.craftingStation);
}