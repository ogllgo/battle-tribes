import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class InguSerpentComponent {}

export const InguSerpentComponentArray = new ComponentArray<InguSerpentComponent>(ServerComponentType.inguSerpent, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}