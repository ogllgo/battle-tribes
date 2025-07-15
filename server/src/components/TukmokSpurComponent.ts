import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class TukmokSpurComponent {}

export const TukmokSpurComponentArray = new ComponentArray<TukmokSpurComponent>(ServerComponentType.tukmokSpur, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}