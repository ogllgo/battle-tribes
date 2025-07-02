import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

export class SnowberryBushDeadComponent {}

export const SnowberryBushDeadComponentArray = new ComponentArray<SnowberryBushDeadComponent>(ServerComponentType.snowberryBushDead, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}