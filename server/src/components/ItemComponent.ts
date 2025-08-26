import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { ComponentArray } from "./ComponentArray";
import { ItemType } from "battletribes-shared/items/items";
import { Entity } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";

const enum Vars {
   TICKS_TO_DESPAWN = 300 * Settings.TPS,
   THROWING_ENTITY_PICKUP_COOLDOWN_TICKS = Settings.TPS
}

export class ItemComponent {
   public readonly itemType: ItemType;
   public amount: number;
   
   public throwingEntity: Entity | null;
   /** Number of ticks after throwing for which the throwing entity cannot pick up the item */
   public throwingEntityPickupCooldownTicks: number;

   constructor(itemType: ItemType, amount: number, throwingEntity: Entity | null) {
      this.itemType = itemType;
      this.amount = amount;
      this.throwingEntity = throwingEntity;
      this.throwingEntityPickupCooldownTicks = Vars.THROWING_ENTITY_PICKUP_COOLDOWN_TICKS;
   }
}

export const ItemComponentArray = new ComponentArray<ItemComponent>(ServerComponentType.item, true, getDataLength, addDataToPacket);
ItemComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(itemEntity: Entity): void {
   const itemComponent = ItemComponentArray.getComponent(itemEntity);
   if (itemComponent.throwingEntityPickupCooldownTicks > 0) {
      itemComponent.throwingEntityPickupCooldownTicks--;
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const itemComponent = ItemComponentArray.getComponent(entity);
   packet.addNumber(itemComponent.itemType);
}

export function itemEntityCanBePickedUp(itemEntity: Entity, entity: Entity): boolean {
   const itemComponent = ItemComponentArray.getComponent(itemEntity);
   return entity !== itemComponent.throwingEntity || itemComponent.throwingEntityPickupCooldownTicks === 0;
}