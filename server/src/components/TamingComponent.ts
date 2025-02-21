import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { getStringLengthBytes, Packet } from "../../../shared/src/packets";
import { ComponentArray } from "./ComponentArray";

export class TamingComponent {
   public tamingTier = 0;
   /** Amount of berries eaten in the current tier. */
   public berriesEatenInTier = 0;

   public name = "";
}

export const TamingComponentArray = new ComponentArray<TamingComponent>(ServerComponentType.taming, true, getDataLength, addDataToPacket);

function getDataLength(entity: Entity): number {
   const tamingComponent = TamingComponentArray.getComponent(entity);
   return 3 * Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(tamingComponent.name);
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const tamingComponent = TamingComponentArray.getComponent(entity);
   packet.addNumber(tamingComponent.tamingTier);
   packet.addNumber(tamingComponent.berriesEatenInTier);
   packet.addString(tamingComponent.name);
}