import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { randInt } from "../../../shared/src/utils";
import { ComponentArray } from "./ComponentArray";

export class MossComponent {
   public readonly size = randInt(0, 2);
}

export const MossComponentArray = new ComponentArray<MossComponent>(ServerComponentType.moss, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const mossComponent = MossComponentArray.getComponent(entity);
   packet.addNumber(mossComponent.size);
}