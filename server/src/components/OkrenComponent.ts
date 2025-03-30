import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class OkrenComponent {}

export const OkrenComponentArray = new ComponentArray<OkrenComponent>(ServerComponentType.okren, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {

}