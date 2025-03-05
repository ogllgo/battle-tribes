import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class GlurbBodySegmentComponent {}

export const GlurbBodySegmentComponentArray = new ComponentArray<GlurbBodySegmentComponent>(ServerComponentType.glurbBodySegment, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}