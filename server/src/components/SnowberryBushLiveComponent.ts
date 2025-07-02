import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

export class SnowberryBushLiveComponent {}

export const SnowberryBushLiveComponentArray = new ComponentArray<SnowberryBushLiveComponent>(ServerComponentType.snowberryBushLive, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}