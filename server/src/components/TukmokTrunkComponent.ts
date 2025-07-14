import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class TukmokTrunkComponent {}

export const TukmokTrunkComponentArray = new ComponentArray<TukmokTrunkComponent>(ServerComponentType.tukmokTrunk, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}