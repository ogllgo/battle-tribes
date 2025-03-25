import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";

export class PunjiSticksComponent {}

export const PunjiSticksComponentArray = new ComponentArray<PunjiSticksComponent>(ServerComponentType.punjiSticks, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}