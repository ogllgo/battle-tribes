import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { ComponentArray } from "./ComponentArray";
import { removeFleshSword } from "../flesh-sword-ai";
import { ItemType } from "battletribes-shared/items/items";
import { Entity } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityAgeTicks, getEntityLayer } from "../world";
import { createItemEntityConfig } from "../entities/item-entity";
import { createEntity } from "../Entity";
import { getRandomPositionInEntity, TransformComponentArray } from "./TransformComponent";

const enum Vars {
   TICKS_TO_DESPAWN = 300 * Settings.TPS
}

export class ItemComponent {
   public readonly itemType: ItemType;
   public amount: number;
   
   /** Stores which entities are on cooldown to pick up the item, and their remaining cooldowns */
   readonly entityPickupCooldowns: Partial<Record<number, number>> = {};

   public throwingEntity: Entity | null = null;

   constructor(itemType: ItemType, amount: number, throwingEntity: Entity | null) {
      this.itemType = itemType;
      this.amount = amount;

      if (throwingEntity !== null) {
         // Add a pickup cooldown so the item isn't picked up immediately
         this.entityPickupCooldowns[throwingEntity] = 1;
      }
   }
}

export const ItemComponentArray = new ComponentArray<ItemComponent>(ServerComponentType.item, true, getDataLength, addDataToPacket);
ItemComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
},
ItemComponentArray.onRemove = onRemove;

function onRemove(entity: Entity): void {
   // Remove flesh sword item entities
   const itemComponent = ItemComponentArray.getComponent(entity);
   if (itemComponent.itemType === ItemType.flesh_sword) {
      removeFleshSword(entity);
   }
}

function onTick(itemEntity: Entity): void {
   const itemComponent = ItemComponentArray.getComponent(itemEntity);
   
   // @Speed
   for (const entityID of Object.keys(itemComponent.entityPickupCooldowns).map(idString => Number(idString))) {
      itemComponent.entityPickupCooldowns[entityID]! -= Settings.I_TPS;
      if (itemComponent.entityPickupCooldowns[entityID]! <= 0) {
         delete itemComponent.entityPickupCooldowns[entityID];
      }
   }
   
   // Despawn old items
   const ageTicks = getEntityAgeTicks(itemEntity);
   if (ageTicks >= Vars.TICKS_TO_DESPAWN) {
      destroyEntity(itemEntity);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const itemComponent = ItemComponentArray.getComponent(entity);
   packet.addNumber(itemComponent.itemType);
}

export function createItemsOverEntity(entity: Entity, itemType: ItemType, amount: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < amount; i++) {
      const position = getRandomPositionInEntity(transformComponent);

      // Create item entity
      const config = createItemEntityConfig(itemType, 1, null);
      config.components[ServerComponentType.transform].position.x = position.x;
      config.components[ServerComponentType.transform].position.y = position.y;
      config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      createEntity(config, getEntityLayer(entity), 0);
   }
}