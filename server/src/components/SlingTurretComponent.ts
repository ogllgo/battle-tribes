import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class SlingTurretComponent {}

export const SlingTurretComponentArray = new ComponentArray<SlingTurretComponent>(ServerComponentType.slingTurret, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}