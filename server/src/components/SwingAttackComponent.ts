import { assertBoxIsCircular, Hitbox } from "../../../shared/src/boxes/boxes";
import { HitFlags } from "../../../shared/src/client-server-types";
import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness, calculateAttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { getItemAttackInfo, getItemType, HammerItemType, InventoryName, Item, ITEM_INFO_RECORD, ItemType, itemTypeIsHammer } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { StatusEffect } from "../../../shared/src/status-effects";
import { TribesmanTitle } from "../../../shared/src/titles";
import { Point } from "../../../shared/src/utils";
import { createItemEntityConfig } from "../entities/item-entity";
import { calculateItemKnockback } from "../entities/tribes/limb-use";
import { calculateItemDamage } from "../entities/tribes/tribe-member";
import { createEntity } from "../Entity";
import { destroyEntity, entityExists, getEntityLayer, getEntityType } from "../world";
import { BerryBushComponentArray, dropBerryOverEntity } from "./BerryBushComponent";
import { BerryBushPlantedComponentArray } from "./BerryBushPlantedComponent";
import { doBlueprintWork } from "./BlueprintComponent";
import { ComponentArray } from "./ComponentArray";
import { damageEntity, healEntity, HealthComponentArray } from "./HealthComponent";
import { InventoryComponentArray, hasInventory, getInventory } from "./InventoryComponent";
import { getHeldItem, getLimbConfiguration, InventoryUseComponentArray, lerpHitboxBetweenStates, LimbInfo } from "./InventoryUseComponent";
import { applyKnockback } from "./PhysicsComponent";
import { applyStatusEffect } from "./StatusEffectComponent";
import { TransformComponentArray } from "./TransformComponent";
import { entitiesBelongToSameTribe, EntityRelationship, getEntityRelationship, TribeComponentArray } from "./TribeComponent";
import { hasTitle } from "./TribesmanComponent";

export class SwingAttackComponent {
   public readonly owner: Entity;
   public readonly limb: LimbInfo;
   // @Cleanup: Is this necessary? Could we do it with just a tick event?
   public isBlocked = false;

   constructor(owner: Entity, limb: LimbInfo) {
      this.owner = owner;
      this.limb = limb;
   }
}

export const SwingAttackComponentArray = new ComponentArray<SwingAttackComponent>(ServerComponentType.swingAttack, true, getDataLength, addDataToPacket);
SwingAttackComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};
SwingAttackComponentArray.onEntityCollision = onEntityCollision;

function onTick(swingAttack: Entity): void {
   const swingAttackTransformComponent = TransformComponentArray.getComponent(swingAttack);
   const limbHitbox = swingAttackTransformComponent.hitboxes[0];
   
   const swingAttackComponent = SwingAttackComponentArray.getComponent(swingAttack);
   const limb = swingAttackComponent.limb;
   
   const isFlipped = limb.associatedInventory.name === InventoryName.offhand;
   const swingProgress = limb.currentActionElapsedTicks / limb.currentActionDurationTicks;
   const ownerTransformComponent = TransformComponentArray.getComponent(swingAttackComponent.owner);
   lerpHitboxBetweenStates(ownerTransformComponent, limbHitbox, limb.currentActionStartLimbState, limb.currentActionEndLimbState, swingProgress, isFlipped);
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

const shouldRepairBuilding = (entity: Entity, comparingEntity: Entity): boolean => {
   if (getEntityRelationship(entity, comparingEntity) !== EntityRelationship.friendlyBuilding) {
      return false;
   }

   if (!entitiesBelongToSameTribe(entity, comparingEntity)) {
      return false;
   }

   const healthComponent = HealthComponentArray.getComponent(comparingEntity);
   return healthComponent.health < healthComponent.maxHealth;
}

const getRepairAmount = (tribeMember: Entity, itemType: HammerItemType): number => {
   const itemInfo = ITEM_INFO_RECORD[itemType];
   let repairAmount = itemInfo.repairAmount;

   if (hasTitle(tribeMember, TribesmanTitle.builder)) {
      repairAmount *= 1.5;
   }
   
   return Math.round(repairAmount);
}

const isBerryBushWithBerries = (entity: Entity): boolean => {
   switch (getEntityType(entity)) {
      case EntityType.berryBush: {
         const berryBushComponent = BerryBushComponentArray.getComponent(entity);
         return berryBushComponent.numBerries > 0;
      }
      case EntityType.berryBushPlanted: {
         const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);
         return berryBushPlantedComponent.numFruit > 0;
      }
      default: {
         return false;
      }
   }
}

const getPlantGatherAmount = (tribeman: Entity, plant: Entity, gloves: Item | null): number => {
   let amount = 1;

   const entityType = getEntityType(plant);
   if (hasTitle(tribeman, TribesmanTitle.berrymuncher) && (entityType === EntityType.berryBush || entityType === EntityType.berryBushPlanted)) {
      if (Math.random() < 0.3) {
         amount++;
      }
   }

   if (hasTitle(tribeman, TribesmanTitle.gardener)) {
      if (Math.random() < 0.3) {
         amount++;
      }
   }

   if (gloves !== null && gloves.type === ItemType.gardening_gloves) {
      if (Math.random() < 0.2) {
         amount++;
      }
   }

   return amount;
}

const gatherPlant = (plant: Entity, attacker: Entity, gloves: Item | null): void => {
   const plantTransformComponent = TransformComponentArray.getComponent(plant);
   
   if (isBerryBushWithBerries(plant)) {
      const gatherMultiplier = getPlantGatherAmount(attacker, plant, gloves);

      // As hitting the bush will drop a berry regardless, only drop extra ones here
      for (let i = 0; i < gatherMultiplier - 1; i++) {
         dropBerryOverEntity(plant);
      }
   } else {
      const plantHitbox = plantTransformComponent.hitboxes[0];
      assertBoxIsCircular(plantHitbox.box);
      const plantRadius = plantHitbox.box.radius;

      const offsetDirection = 2 * Math.PI * Math.random();
      const x = plantTransformComponent.position.x + (plantRadius - 7) * Math.sin(offsetDirection);
      const y = plantTransformComponent.position.y + (plantRadius - 7) * Math.cos(offsetDirection);
   
      const config = createItemEntityConfig(ItemType.leaf, 1, null);
      config.components[ServerComponentType.transform].position.x = x;
      config.components[ServerComponentType.transform].position.y = y;
      config.components[ServerComponentType.transform].relativeRotation = 2 * Math.PI * Math.random();
      createEntity(config, getEntityLayer(plant), 0);
   }

   // @Hack
   const attackerTransformComponent = TransformComponentArray.getComponent(attacker);
   const collisionPoint = new Point((plantTransformComponent.position.x + attackerTransformComponent.position.x) / 2, (plantTransformComponent.position.y + attackerTransformComponent.position.y) / 2);

   damageEntity(plant, attacker, 0, 0, AttackEffectiveness.ineffective, collisionPoint, HitFlags.NON_DAMAGING_HIT);
}

const damageEntityFromSwing = (swingAttack: Entity, victim: Entity): boolean => {
   const swingAttackComponent = SwingAttackComponentArray.getComponent(swingAttack);
   const attacker = swingAttackComponent.owner;
   const attackingLimb = swingAttackComponent.limb;
   
   const attackingItem = getHeldItem(attackingLimb);

   const targetEntityType = getEntityType(victim);

   const attackEffectiveness = calculateAttackEffectiveness(attackingItem, targetEntityType);

   // Harvest leaves from trees and berries when wearing the gathering or gardening gloves
   if ((attackingItem === null || attackingItem.type === ItemType.leaf) && (targetEntityType === EntityType.tree || targetEntityType === EntityType.berryBush || targetEntityType === EntityType.treePlanted || targetEntityType === EntityType.berryBushPlanted)) {
      const inventoryComponent = InventoryComponentArray.getComponent(attacker);
      if (hasInventory(inventoryComponent, InventoryName.gloveSlot)) {
         const gloveInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);
         const gloves = gloveInventory.itemSlots[1];
         if (typeof gloves !== "undefined" && (gloves.type === ItemType.gathering_gloves || gloves.type === ItemType.gardening_gloves)) {
            gatherPlant(victim, attacker, gloves);
            return true;
         }
      }
   }

   const attackDamage = calculateItemDamage(attacker, attackingItem, attackEffectiveness, swingAttackComponent.isBlocked);
   const attackKnockback = calculateItemKnockback(attackingItem, swingAttackComponent.isBlocked);

   const targetEntityTransformComponent = TransformComponentArray.getComponent(victim);
   const attackerTransformComponent = TransformComponentArray.getComponent(attacker);

   const hitDirection = attackerTransformComponent.position.calculateAngleBetween(targetEntityTransformComponent.position);

   // @Hack
   const collisionPoint = new Point((targetEntityTransformComponent.position.x + attackerTransformComponent.position.x) / 2, (targetEntityTransformComponent.position.y + attackerTransformComponent.position.y) / 2);

   // Register the hit
   const hitFlags = attackingItem !== null && attackingItem.type === ItemType.flesh_sword ? HitFlags.HIT_BY_FLESH_SWORD : 0;
   damageEntity(victim, attacker, attackDamage, DamageSource.tribeMember, attackEffectiveness, collisionPoint, hitFlags);
   applyKnockback(victim, attackKnockback, hitDirection);

   if (attackingItem !== null && attackingItem.type === ItemType.flesh_sword) {
      applyStatusEffect(victim, StatusEffect.poisoned, 3 * Settings.TPS);
   }

   // Bloodaxes have a 20% chance to inflict bleeding on hit
   if (hasTitle(attacker, TribesmanTitle.bloodaxe) && Math.random() < 0.2) {
      applyStatusEffect(victim, StatusEffect.bleeding, 2 * Settings.TPS);
   }

   return true;
}

function onEntityCollision(swingAttack: Entity, collidingEntity: Entity): void {
   const swingAttackComponent = SwingAttackComponentArray.getComponent(swingAttack);
   const owner = swingAttackComponent.owner;
   // @Temporary: remove when bug is fixed
   if (!entityExists(owner)) {
      throw new Error();
   }
   // @Temporary: remove when bug is fixed
   if (!TribeComponentArray.hasComponent(owner)) {
      console.log(getEntityType(owner));
      throw new Error();
   }
   
   // Build blueprints and repair buildings
   const swingItemType = getItemType(getHeldItem(swingAttackComponent.limb));
   if (swingItemType !== null && itemTypeIsHammer(swingItemType)) {
      if (getEntityType(collidingEntity) === EntityType.blueprintEntity) {
         if (entitiesBelongToSameTribe(owner, collidingEntity)) {
            doBlueprintWork(collidingEntity, swingItemType);
            destroyEntity(swingAttack);
            return;
         }
      } else if (shouldRepairBuilding(owner, collidingEntity)) {
         const repairAmount = getRepairAmount(owner, swingItemType);
         healEntity(collidingEntity, repairAmount, owner);
         destroyEntity(swingAttack);
         return;
      }
   }

   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Don't attack friendlies
   const relationship = getEntityRelationship(owner, collidingEntity);
   if (relationship === EntityRelationship.friendly) {
      return;
   }
   
   damageEntityFromSwing(swingAttack, collidingEntity);
   destroyEntity(swingAttack);
}