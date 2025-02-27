import { Entity, TreeSize } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { TransformComponentArray } from "./TransformComponent";
import { createCircularGrassBlocker } from "../grass-blockers";
import { Packet } from "battletribes-shared/packets";
import { getEntityLayer } from "../world";

export const TREE_RADII: ReadonlyArray<number> = [40, 50];

const TREE_TRUNK_RADII: Record<TreeSize, number> = {
   [TreeSize.small]: 15,
   [TreeSize.large]: 22
};

export class TreeComponent {
   readonly treeSize: TreeSize;

   constructor(size: number) {
      this.treeSize = size;
   }
}

export const TreeComponentArray = new ComponentArray<TreeComponent>(ServerComponentType.tree, true, getDataLength, addDataToPacket);
TreeComponentArray.onJoin = onJoin;

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const treeComponent = TreeComponentArray.getComponent(entity);
   createCircularGrassBlocker(transformComponent.position.copy(), getEntityLayer(entity), 0, 0.9, TREE_TRUNK_RADII[treeComponent.treeSize], entity)
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const treeComponent = TreeComponentArray.getComponent(entity);
   packet.addNumber(treeComponent.treeSize);
}