import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class TukmokComponent {}

export const TukmokComponentArray = new ComponentArray<TukmokComponent>(ServerComponentType.tukmok, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}