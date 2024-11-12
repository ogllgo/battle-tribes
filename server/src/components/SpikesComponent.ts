import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";

export class SpikesComponent {
   public isCovered = false;
}

export const SpikesComponentArray = new ComponentArray<SpikesComponent>(ServerComponentType.spikes, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const spikesComponent = SpikesComponentArray.getComponent(entity);
   packet.addBoolean(spikesComponent.isCovered);
   packet.padOffset(3);
}