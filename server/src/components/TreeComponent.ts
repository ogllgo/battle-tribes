import { Entity, TreeSize } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { GrassBlockerCircle } from "battletribes-shared/grass-blockers";
import { ServerComponentType } from "battletribes-shared/components";
import { TransformComponentArray } from "./TransformComponent";
import { addGrassBlocker } from "../grass-blockers";
import { Packet } from "battletribes-shared/packets";
import { ItemType } from "battletribes-shared/items/items";
import { randInt } from "battletribes-shared/utils";
import { createItemsOverEntity } from "../entities/item-entity";

export const TREE_RADII: ReadonlyArray<number> = [40, 50];

const SEED_DROP_CHANCES: ReadonlyArray<number> = [0.25, 0.5];

const WOOD_DROP_AMOUNTS: ReadonlyArray<[number, number]> = [
   [2, 4],
   [5, 7]
];

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
TreeComponentArray.preRemove = preRemove;

function onJoin(entity: Entity): void {
   const treeComponent = TreeComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const blocker: GrassBlockerCircle = {
      position: transformComponent.position.copy(),
      blockAmount: 0,
      radius: TREE_TRUNK_RADII[treeComponent.treeSize],
      maxBlockAmount: 0.9
   };
   addGrassBlocker(blocker, entity);
}

function preRemove(tree: Entity): void {
   const treeComponent = TreeComponentArray.getComponent(tree);

   createItemsOverEntity(tree, ItemType.wood, randInt(...WOOD_DROP_AMOUNTS[treeComponent.treeSize]));

   const dropChance = SEED_DROP_CHANCES[treeComponent.treeSize];
   if (Math.random() < dropChance) {
      createItemsOverEntity(tree, ItemType.seed, 1)
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const treeComponent = TreeComponentArray.getComponent(entity);
   packet.addNumber(treeComponent.treeSize);
}