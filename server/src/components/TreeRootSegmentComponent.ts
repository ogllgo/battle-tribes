import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { ItemType } from "../../../shared/src/items/items";
import { Packet } from "../../../shared/src/packets";
import { assert, randInt } from "../../../shared/src/utils";
import { createItemsOverEntity } from "../entities/item-entity";
import { entityExists } from "../world";
import { ComponentArray } from "./ComponentArray";
import { TreeRootBaseComponentArray } from "./TreeRootBaseComponent";

export class TreeRootSegmentComponent {
   readonly root: Entity;
   public readonly variation = randInt(0, 3);

   constructor(root: Entity) {
      this.root = root;
   }
}

export const TreeRootSegmentComponentArray = new ComponentArray<TreeRootSegmentComponent>(ServerComponentType.treeRootSegment, true, getDataLength, addDataToPacket);
TreeRootSegmentComponentArray.onJoin = onJoin;
TreeRootSegmentComponentArray.onDeath = onDeath;
TreeRootSegmentComponentArray.onRemove = onRemove;

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const treeRootSegmentComponent = TreeRootSegmentComponentArray.getComponent(entity);
   packet.addNumber(treeRootSegmentComponent.variation);
}

function onJoin(entity: Entity): void {
   const treeRootSegmentComponent = TreeRootSegmentComponentArray.getComponent(entity);

   const treeRootBaseComponent = TreeRootBaseComponentArray.getComponent(treeRootSegmentComponent.root);
   treeRootBaseComponent.segments.push(entity);
}

function onDeath(entity: Entity): void {
   createItemsOverEntity(entity, ItemType.wood, randInt(1, 2));
}

function onRemove(entity: Entity): void {
   const treeRootSegmentComponent = TreeRootSegmentComponentArray.getComponent(entity);

   if (entityExists(treeRootSegmentComponent.root)) {
      const treeRootBaseComponent = TreeRootBaseComponentArray.getComponent(treeRootSegmentComponent.root);
      const idx = treeRootBaseComponent.segments.indexOf(entity);
      assert(idx !== -1);
      treeRootBaseComponent.segments.splice(idx, 1);
   }
}