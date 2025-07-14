import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class TukmokTailComponent {}

export const TukmokTailComponentArray = new ComponentArray<TukmokTailComponent>(ServerComponentType.tukmokTail, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}