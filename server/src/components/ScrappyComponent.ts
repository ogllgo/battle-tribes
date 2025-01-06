import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class ScrappyComponent {}

export const ScrappyComponentArray = new ComponentArray<ScrappyComponent>(ServerComponentType.scrappy, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}