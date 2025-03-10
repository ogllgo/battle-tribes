import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { ITEM_TYPE_RECORD, ItemType } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { assert } from "../../../shared/src/utils";
import { createItemsOverEntity } from "../entities/item-entity";
import { getHitboxTile, Hitbox } from "../hitboxes";
import { getEntityLayer, getEntityType } from "../world";
import { LocalBiome } from "../world-generation/terrain-generation-utils";
import { ComponentArray } from "./ComponentArray";
import { getTransformComponentFirstHitbox, TransformComponentArray } from "./TransformComponent";

export interface LootEntry {
   readonly itemType: ItemType;
   readonly getAmount: (entity: Entity) => number;
   /** Called every time an item is dropped. */
   readonly onItemDrop?: (entity: Entity) => void;
}

const lootOnHitRecord: Partial<Record<EntityType, ReadonlyArray<LootEntry>>> = {};
const lootOnDeathRecord: Partial<Record<EntityType, ReadonlyArray<LootEntry>>> = {};

const itemToEntityTypesRecord: Partial<Record<ItemType, Array<EntityType>>> = {};

export class LootComponent {
   public localBiome: LocalBiome | null = null;
}

export const LootComponentArray = new ComponentArray<LootComponent>(ServerComponentType.loot, true, getDataLength, addDataToPacket);
LootComponentArray.onJoin = onJoin;
LootComponentArray.onTick = {
   tickInterval: Settings.TPS,
   func: onTick
};
LootComponentArray.onRemove = onRemove;
LootComponentArray.onTakeDamage = onHit;
LootComponentArray.onDeath = onDeath;

const registerEntries = (entityType: EntityType, lootEntries: ReadonlyArray<LootEntry>): void => {
   for (const entry of lootEntries) {
      const entityTypes = itemToEntityTypesRecord[entry.itemType];
      if (typeof entityTypes === "undefined") {
         itemToEntityTypesRecord[entry.itemType] = [entityType];
      } else {
         entityTypes.push(entityType);
      }
   }
}

export function registerEntityLootOnHit(entityType: EntityType, lootEntries: ReadonlyArray<LootEntry>): void {
   assert(typeof lootOnHitRecord[entityType] === "undefined");
   lootOnHitRecord[entityType] = lootEntries;
   registerEntries(entityType, lootEntries);
}

export function registerEntityLootOnDeath(entityType: EntityType, lootEntries: ReadonlyArray<LootEntry>): void {
   assert(typeof lootOnDeathRecord[entityType] === "undefined");
   lootOnDeathRecord[entityType] = lootEntries;
   registerEntries(entityType, lootEntries);
}

const removeFromPreviousLocalBiome = (entity: Entity, lootComponent: LootComponent): void => {
   if (lootComponent.localBiome === null) {
      return;
   }

   const census = lootComponent.localBiome.entityCensus;
   const entityType = getEntityType(entity);
   
   const previousCount = census.get(entityType);
   assert(typeof previousCount !== "undefined");

   census.set(entityType, previousCount - 1);
   if (previousCount === 1) {
      census.delete(entityType);
   }
}

const addToNewLocalBiome = (entity: Entity, lootComponent: LootComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = getTransformComponentFirstHitbox(transformComponent);
   assert(hitbox !== null);
   
   const layer = getEntityLayer(entity);
   const tileIndex = getHitboxTile(hitbox);
   const localBiome = layer.getTileLocalBiome(tileIndex);

   lootComponent.localBiome = localBiome;

   const entityType = getEntityType(entity);
   const census = localBiome.entityCensus;
 
   const previousCount = census.get(entityType);
   if (typeof previousCount === "undefined") {
      census.set(entityType, 1);
   } else {
      census.set(entityType, previousCount + 1);
   }
}

function onJoin(entity: Entity): void {
   const lootComponent = LootComponentArray.getComponent(entity);
   addToNewLocalBiome(entity, lootComponent);
}

function onTick(entity: Entity): void {
   const lootComponent = LootComponentArray.getComponent(entity);
   removeFromPreviousLocalBiome(entity, lootComponent);
   addToNewLocalBiome(entity, lootComponent);
}

function onRemove(entity: Entity): void {
   const lootComponent = LootComponentArray.getComponent(entity);
   removeFromPreviousLocalBiome(entity, lootComponent);
}

function onHit(entity: Entity): void {
   const entityType = getEntityType(entity);

   const entries = lootOnHitRecord[entityType];
   if (typeof entries !== "undefined") {
      for (const entry of entries) {
         const amount = entry.getAmount(entity);
         createItemsOverEntity(entity, entry.itemType, amount);

         if (typeof entry.onItemDrop !== "undefined") {
            entry.onItemDrop(entity);
         }
      }
   }
}

function onDeath(entity: Entity): void {
   const entityType = getEntityType(entity);

   const entries = lootOnDeathRecord[entityType];
   if (typeof entries !== "undefined") {
      for (const entry of entries) {
         const amount = entry.getAmount(entity);
         createItemsOverEntity(entity, entry.itemType, amount);
      }
   }
}

export function getEntityTypesWhichDropItem(itemType: ItemType): ReadonlyArray<EntityType> {
   const entityTypes = itemToEntityTypesRecord[itemType];
   return typeof entityTypes !== "undefined" ? entityTypes : [];
}

export function entityDropsItem(entity: Entity, itemType: ItemType): boolean {
   const entityType = getEntityType(entity);

   const onHitEntries = lootOnHitRecord[entityType];
   if (typeof onHitEntries !== "undefined") {
      for (const entry of onHitEntries) {
         if (entry.itemType === itemType && entry.getAmount(entity) > 0) {
            return true;
         }
      }
   }

   const onDeathEntries = lootOnDeathRecord[entityType];
   if (typeof onDeathEntries !== "undefined") {
      for (const entry of onDeathEntries) {
         if (entry.itemType === itemType && entry.getAmount(entity) > 0) {
            return true;
         }
      }
   }

   return false;
}

// @Location: should this really be in the LootComponent? Feels like it should be in the place which calls it
export function entityDropsFoodItem(entity: Entity): boolean {
   const entityType = getEntityType(entity);

   const onHitEntries = lootOnHitRecord[entityType];
   if (typeof onHitEntries !== "undefined") {
      for (const entry of onHitEntries) {
         if (ITEM_TYPE_RECORD[entry.itemType] === "healing" && entry.getAmount(entity) > 0) {
            return true;
         }
      }
   }

   const onDeathEntries = lootOnDeathRecord[entityType];
   if (typeof onDeathEntries !== "undefined") {
      for (const entry of onDeathEntries) {
         if (ITEM_TYPE_RECORD[entry.itemType] === "healing" && entry.getAmount(entity) > 0) {
            return true;
         }
      }
   }

   return false;
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}