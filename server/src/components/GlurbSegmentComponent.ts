import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { ComponentArray } from "./ComponentArray";

export class GlurbSegmentComponent {
   public mossBallCompleteness = 0;
}

export const GlurbSegmentComponentArray = new ComponentArray<GlurbSegmentComponent>(ServerComponentType.glurbSegment, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const glurbSegmentComponent = GlurbSegmentComponentArray.getComponent(entity);
   packet.addNumber(glurbSegmentComponent.mossBallCompleteness);
}