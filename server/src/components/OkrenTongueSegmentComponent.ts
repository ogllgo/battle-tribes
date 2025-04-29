import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class OkrenTongueSegmentComponent {}

export const OkrenTongueSegmentComponentArray = new ComponentArray<OkrenTongueSegmentComponent>(ServerComponentType.okrenTongueSegment, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}