import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class DustfleaComponent {}

export const DustfleaComponentArray = new ComponentArray<DustfleaComponent>(ServerComponentType.dustflea, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}