import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class InguYetuksnoglurblidokowfleaSeekerHeadComponent {}

export const InguYetuksnoglurblidokowfleaSeekerHeadComponentArray = new ComponentArray<InguYetuksnoglurblidokowfleaSeekerHeadComponent>(ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead, true, getDataLength, addDataToPacket);

export function moveSeekerHeadToTarget(seekerHead: Entity, target: Entity): void {

}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}