import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class WraithComponent {}

export const WraithComponentArray = new ComponentArray<WraithComponent>(ServerComponentType.wraith, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}