import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { randInt } from "../../../shared/src/utils";
import { ComponentArray } from "./ComponentArray";

export class TreeRootSegmentComponent {
   public readonly variation = randInt(0, 2);
}

export const TreeRootSegmentComponentArray = new ComponentArray<TreeRootSegmentComponent>(ServerComponentType.treeRootSegment, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const treeRootSegmentComponent = TreeRootSegmentComponentArray.getComponent(entity);
   packet.addNumber(treeRootSegmentComponent.variation);
}