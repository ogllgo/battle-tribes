import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class SlurbTorchComponent {}

export const SlurbTorchComponentArray = new ComponentArray<SlurbTorchComponent>(ServerComponentType.slurbTorch, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}