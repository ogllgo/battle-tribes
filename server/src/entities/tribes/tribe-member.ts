import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { BlueprintType, BuildingMaterial, MATERIAL_TO_ITEM_MAP, ServerComponentType } from "battletribes-shared/components";
import { EntityType, Entity, LimbAction } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { calculateEntityPlaceInfo, StructurePlaceInfo } from "battletribes-shared/structures";
import { TribesmanTitle } from "battletribes-shared/titles";
import { TribeType } from "battletribes-shared/tribes";
import { Point, dotAngles, lerp } from "battletribes-shared/utils";
import { createEntity } from "../../Entity";
import Layer from "../../Layer";
import { InventoryComponentArray, consumeItemFromSlot, consumeItemType, countItemType, getInventory, inventoryIsFull } from "../../components/InventoryComponent";
import { getEntitiesInRange } from "../../ai-shared";
import { HealthComponentArray, healEntity } from "../../components/HealthComponent";
import { clearStatusEffects } from "../../components/StatusEffectComponent";
import { InventoryUseComponentArray } from "../../components/InventoryUseComponent";
import { createBattleaxeProjectileConfig } from "../projectiles/battleaxe-projectile";
import { createIceArrowConfig } from "../projectiles/ice-arrow";
import { TribeComponentArray } from "../../components/TribeComponent";
import { PhysicsComponentArray } from "../../components/PhysicsComponent";
import Tribe from "../../Tribe";
import { TribesmanAIComponentArray } from "../../components/TribesmanAIComponent";
import { TribeMemberComponentArray } from "../../components/TribeMemberComponent";
import { createItemEntityConfig } from "../item-entity";
import { StructureComponentArray } from "../../components/StructureComponent";
import { BuildingMaterialComponentArray } from "../../components/BuildingMaterialComponent";
import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { Item, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, BattleaxeItemInfo, SwordItemInfo, AxeItemInfo, InventoryName, ItemType, ConsumableItemInfo, ConsumableItemCategory, PlaceableItemType, BowItemInfo, itemIsStackable, getItemStackSize } from "battletribes-shared/items/items";
import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import { registerEntityTickEvent } from "../../server/player-clients";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createWoodenArrowConfig } from "../projectiles/wooden-arrow";
import { EntityConfig } from "../../components";
import { createSpearProjectileConfig } from "../projectiles/spear-projectile";
import { createBlueprintEntityConfig } from "../blueprint-entity";
import { AttackVars } from "battletribes-shared/attack-patterns";
import { destroyEntity, getEntityLayer, getEntityType, getGameTicks } from "../../world";
import { createWallConfig } from "../structures/wall";
import { createDoorConfig } from "../structures/door";
import { createEmbrasureConfig } from "../structures/embrasure";
import { createFloorSpikesConfig, createWallSpikesConfig } from "../structures/spikes";
import { createFloorPunjiSticksConfig, createWallPunjiSticksConfig } from "../structures/punji-sticks";
import { createBallistaConfig } from "../structures/ballista";
import { createSlingTurretConfig } from "../structures/sling-turret";
import { createTunnelConfig } from "../structures/tunnel";
import { createTribeTotemConfig } from "../structures/tribe-totem";
import { createWorkerHutConfig } from "../structures/worker-hut";
import { createWarriorHutConfig } from "../structures/warrior-hut";
import { createBarrelConfig } from "../structures/barrel";
import { createWorkbenchConfig } from "../structures/workbench";
import { createResearchBenchConfig } from "../structures/research-bench";
import { createHealingTotemConfig } from "../structures/healing-totem";
import { createPlanterBoxConfig } from "../structures/planter-box";
import { createFurnaceConfig } from "../structures/cooking-entities/furnace";
import { createCampfireConfig } from "../structures/cooking-entities/campfire";
import { createFenceConfig } from "../structures/fence";
import { createFenceGateConfig } from "../structures/fence-gate";
import { createFrostshaperConfig } from "../structures/frostshaper";
import { createStonecarvingTableConfig } from "../structures/stonecarving-table";
import { createBracingsConfig } from "../structures/bracings";
import { createFireTorchConfig } from "../structures/fire-torch";
import { createSlurbTorchConfig } from "../structures/slurb-torch";
import { getLayerInfo } from "../../layers";
import { createScrappyConfig } from "./automatons/scrappy";
import { createCogwalkerConfig } from "./automatons/cogwalker";
import { awardTitle, hasTitle, TribesmanComponentArray } from "../../components/TribesmanComponent";

const enum Vars {
   ITEM_THROW_FORCE = 100,
   ITEM_THROW_OFFSET = 32
}

export const VACUUM_RANGE = 85;

const getDamageMultiplier = (entity: Entity): number => {
   let multiplier = 1;

   if (TribesmanComponentArray.hasComponent(entity)) {
      const tribesmanComponent = TribesmanComponentArray.getComponent(entity);

      for (let i = 0; i < tribesmanComponent.titles.length; i++) {
         const title = tribesmanComponent.titles[i].title;

         switch (title) {
            case TribesmanTitle.deathbringer: {
               multiplier *= 1.15;
               break;
            }
         }
      }
   }

   return multiplier;
}

export function calculateItemDamage(entity: Entity, item: Item | null, attackEffectiveness: AttackEffectiveness, attackIsBlocked: boolean): number {
   if (attackEffectiveness === AttackEffectiveness.stopped) {
      return 0;
   }
   
   let damage: number;
   if (item === null) {
      damage = 1;
   } else {
      // @Cleanup
      const itemCategory = ITEM_TYPE_RECORD[item.type];
      switch (itemCategory) {
         case "battleaxe": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as BattleaxeItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
               damage = itemInfo.damage;
            } else {
               damage = Math.floor(itemInfo.damage / 2);
            }
            break;
         }
         case "spear":
         case "sword": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as SwordItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
               damage = itemInfo.damage;
            } else {
               damage = Math.floor(itemInfo.damage / 2);
            }
            break;
         }
         case "axe": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as AxeItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
               damage = itemInfo.damage;
            } else {
               damage = Math.ceil(itemInfo.damage / 3);
            }
            break;
         }
         case "pickaxe": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as AxeItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
               damage = itemInfo.damage;
            } else {
               damage = Math.floor(itemInfo.damage / 4);
            }
            break;
         }
         default: {
            damage = 1;
         }
      }
   }

   if (attackIsBlocked) {
      damage *= 0.5;
   }

   return damage * getDamageMultiplier(entity);
}

const getRepairTimeMultiplier = (tribeMember: Entity): number => {
   let multiplier = 1;
   
   if (getEntityType(tribeMember) === EntityType.tribeWarrior) {
      multiplier *= 2;
   }

   return multiplier;
}

// @Incomplete: unused
export function getSwingTimeMultiplier(entity: Entity, item: Item | null): number {
   let swingTimeMultiplier = 1;

   if (TribeComponentArray.hasComponent(entity)) {
      // Barbarians swing 30% slower
      const tribeComponent = TribeComponentArray.getComponent(entity);
      if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
         swingTimeMultiplier /= 0.7;
      }
   }

   // Builers swing hammers 30% faster
   if (hasTitle(entity, TribesmanTitle.builder) && item !== null && ITEM_TYPE_RECORD[item.type] === "hammer") {
      swingTimeMultiplier /= 1.3;
   }

   return swingTimeMultiplier;
}

// @Cleanup: Rename function. shouldn't be 'attack'
// @Cleanup: Not just for tribe members, move to different file
export function calculateRadialAttackTargets(entity: Entity, attackOffset: number, attackRadius: number): ReadonlyArray<Entity> {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const layer = getEntityLayer(entity);
   
   const attackPositionX = transformComponent.position.x + attackOffset * Math.sin(transformComponent.rotation);
   const attackPositionY = transformComponent.position.y + attackOffset * Math.cos(transformComponent.rotation);
   const attackedEntities = getEntitiesInRange(layer, attackPositionX, attackPositionY, attackRadius);
   
   // Don't attack yourself
   for (;;) {
      const idx = attackedEntities.indexOf(entity);
      if (idx !== -1) {
         attackedEntities.splice(idx, 1);
      } else {
         break;
      }
   }

   return attackedEntities;
}

// @Incomplete: make this require place info
export function placeBuilding(tribe: Tribe, layer: Layer, placeInfo: StructurePlaceInfo): void {
   let config: EntityConfig<ServerComponentType.transform>;
   switch (placeInfo.entityType) {
      case EntityType.wall: config = createWallConfig(tribe, BuildingMaterial.wood, placeInfo.connections, null); break;
      case EntityType.door: config = createDoorConfig(tribe, BuildingMaterial.wood, placeInfo.connections, null); break;
      case EntityType.embrasure: config = createEmbrasureConfig(tribe, BuildingMaterial.wood, placeInfo.connections, null); break;
      case EntityType.floorSpikes: config = createFloorSpikesConfig(tribe, BuildingMaterial.wood, placeInfo.connections, null); break;
      case EntityType.wallSpikes: config = createWallSpikesConfig(tribe, BuildingMaterial.wood, placeInfo.connections, null); break;
      case EntityType.tunnel: config = createTunnelConfig(tribe, BuildingMaterial.wood, placeInfo.connections, null); break;
      case EntityType.floorPunjiSticks: config = createFloorPunjiSticksConfig(tribe, placeInfo.connections, null); break;
      case EntityType.wallPunjiSticks: config = createWallPunjiSticksConfig(tribe, placeInfo.connections, null); break;
      case EntityType.ballista: config = createBallistaConfig(tribe, placeInfo.connections, null); break;
      case EntityType.slingTurret: config = createSlingTurretConfig(tribe, placeInfo.connections, null); break;
      case EntityType.tribeTotem: config = createTribeTotemConfig(tribe, placeInfo.connections, null); break;
      case EntityType.workerHut: config = createWorkerHutConfig(tribe, placeInfo.connections, null); break;
      case EntityType.warriorHut: config = createWarriorHutConfig(tribe, placeInfo.connections, null); break;
      case EntityType.barrel: config = createBarrelConfig(tribe, placeInfo.connections, null); break;
      case EntityType.workbench: config = createWorkbenchConfig(tribe, placeInfo.connections, null); break;
      case EntityType.researchBench: config = createResearchBenchConfig(tribe, placeInfo.connections, null); break;
      case EntityType.healingTotem: config = createHealingTotemConfig(tribe, placeInfo.connections, null); break;
      case EntityType.planterBox: config = createPlanterBoxConfig(tribe, placeInfo.connections, null); break;
      case EntityType.furnace: config = createFurnaceConfig(tribe, placeInfo.connections, null); break;
      case EntityType.campfire: config = createCampfireConfig(tribe, placeInfo.connections, null); break;
      case EntityType.fence: config = createFenceConfig(tribe, placeInfo.connections, null); break;
      case EntityType.fenceGate: config = createFenceGateConfig(tribe, placeInfo.connections, null); break;
      case EntityType.frostshaper: config = createFrostshaperConfig(tribe, placeInfo.connections, null); break;
      case EntityType.stonecarvingTable: config = createStonecarvingTableConfig(tribe, placeInfo.connections, null); break;
      case EntityType.bracings: config = createBracingsConfig(placeInfo.hitboxes, tribe, BuildingMaterial.wood, null); break;
      case EntityType.fireTorch: config = createFireTorchConfig(tribe, placeInfo.connections, null); break;
      case EntityType.slurbTorch: config = createSlurbTorchConfig(tribe, placeInfo.connections, null); break;
      case EntityType.scrappy: config = createScrappyConfig(tribe); break;
      case EntityType.cogwalker: config = createCogwalkerConfig(tribe); break;
      // @Robustness?
      default: {
         throw new Error();
      }
   }
   
   config.components[ServerComponentType.transform].position.x = placeInfo.position.x;
   config.components[ServerComponentType.transform].position.y = placeInfo.position.y;
   config.components[ServerComponentType.transform].rotation = placeInfo.rotation;
   createEntity(config, layer, 0);
}

export function useItem(tribeMember: Entity, item: Item, inventoryName: InventoryName, itemSlot: number): void {
   const itemCategory = ITEM_TYPE_RECORD[item.type];

   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
   
   // @Cleanup: Extract each one of these cases into their own function

   switch (itemCategory) {
      case "armour": {
         // 
         // Equip the armour
         // 
         
         const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
         const targetItem = armourSlotInventory.itemSlots[1];
         
         // If the target item slot has a different item type, don't attempt to transfer
         if (typeof targetItem !== "undefined" && targetItem.type !== item.type) {
            return;
         }
         
         // Move to armour slot
         const inventory = getInventory(inventoryComponent, inventoryName);
         inventory.removeItem(itemSlot);
         armourSlotInventory.addItem(item, 1);
         break;
      }
      case "glove": {
         // 
         // Equip the glove
         // 
         
         const gloveSlotInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);
         const targetItem = gloveSlotInventory.itemSlots[1];

         // If the target item slot has a different item type, don't attempt to transfer
         if (typeof targetItem !== "undefined" && targetItem.type !== item.type) {
            return;
         }

         // Move to glove slot
         const inventory = getInventory(inventoryComponent, inventoryName);
         inventory.removeItem(itemSlot);
         gloveSlotInventory.addItem(item, 1);
         break;
      }
      case "healing": {
         const healthComponent = HealthComponentArray.getComponent(tribeMember);
         
         // Don't use food if already at maximum health
         if (healthComponent.health >= healthComponent.maxHealth) return;

         const itemInfo = ITEM_INFO_RECORD[item.type] as ConsumableItemInfo;
         
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);

         const inventory = getInventory(inventoryComponent, inventoryName);
         const limb = inventoryUseComponent.getLimbInfo(inventoryName)
         
         healEntity(tribeMember, itemInfo.healAmount, tribeMember);
         consumeItemFromSlot(tribeMember, inventory, itemSlot, 1);

         limb.lastEatTicks = getGameTicks();

         if (item.type === ItemType.berry && Math.random() < 0.05) {
            awardTitle(tribeMember, TribesmanTitle.berrymuncher);
         }

         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            // Remove all debuffs
            clearStatusEffects(tribeMember);
         }

         // If all of the item was consumed, stop the eating action
         if (!inventory.hasItem(itemSlot)) {
            limb.action = LimbAction.none;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = 0;
         }

         break;
      }
      case "placeable": {
         const transformComponent = TransformComponentArray.getComponent(tribeMember);
         
         const structureType = ITEM_INFO_RECORD[item.type as PlaceableItemType].entityType;
         const placeInfo = calculateEntityPlaceInfo(transformComponent.position, transformComponent.rotation, structureType, getLayerInfo(getEntityLayer(tribeMember)));

         if (placeInfo.isValid) {
            const tribeComponent = TribeComponentArray.getComponent(tribeMember);
            placeBuilding(tribeComponent.tribe, getEntityLayer(tribeMember), placeInfo);

            const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
            consumeItemFromSlot(tribeMember, inventory, itemSlot, 1);
         }
         break;
      }
      case "bow": {
         const transformComponent = TransformComponentArray.getComponent(tribeMember);

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         const limb = inventoryUseComponent.getLimbInfo(inventoryName);
         if (limb.action !== LimbAction.chargeBow || limb.currentActionElapsedTicks < limb.currentActionDurationTicks) {
            return;
         }

         const event: EntityTickEvent<EntityTickEventType.fireBow> = {
            entityID: tribeMember,
            type: EntityTickEventType.fireBow,
            data: item.type
         };
         registerEntityTickEvent(tribeMember, event);

         limb.lastBowChargeTicks = getGameTicks();

         const itemInfo = ITEM_INFO_RECORD[item.type] as BowItemInfo;

         // Offset the arrow's spawn to be just outside of the tribe member's hitbox
         // @Speed: Garbage collection
         const spawnPosition = transformComponent.position.copy();
         const offset = Point.fromVectorForm(35, transformComponent.rotation);
         spawnPosition.add(offset);

         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         let config: EntityConfig<ServerComponentType.transform | ServerComponentType.physics | ServerComponentType.tribe | ServerComponentType.projectile>;
         switch (item.type) {
            case ItemType.wooden_bow:
            case ItemType.reinforced_bow: {
               config = createWoodenArrowConfig(tribeComponent.tribe, tribeMember);
               break;
            }
            case ItemType.ice_bow: {
               config = createIceArrowConfig(tribeComponent.tribe, tribeMember);
               break;
            }
            // @Robustness
            default: {
               throw new Error("No case for bow type " + item.type);
            }
         }
         config.components[ServerComponentType.transform].position.x = spawnPosition.x;
         config.components[ServerComponentType.transform].position.y = spawnPosition.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         config.components[ServerComponentType.physics].externalVelocity.x = itemInfo.projectileSpeed * Math.sin(transformComponent.rotation);
         config.components[ServerComponentType.physics].externalVelocity.y = itemInfo.projectileSpeed * Math.cos(transformComponent.rotation);
         createEntity(config, getEntityLayer(tribeMember), 0);

         for (let i = 0; i < 2; i++) {
            const limb = inventoryUseComponent.getLimbInfo(i === 0 ? InventoryName.hotbar : InventoryName.offhand);
            limb.action = LimbAction.none;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = AttackVars.BOW_REST_TIME_TICKS;
         }
         
         break;
      }
      case "crossbow": {
         const transformComponent = TransformComponentArray.getComponent(tribeMember);

         // Don't fire if not loaded
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         const useInfo = inventoryUseComponent.getLimbInfo(inventoryName);

         const loadProgress = useInfo.crossbowLoadProgressRecord[itemSlot];
         if (typeof loadProgress === "undefined" || loadProgress < 1) {
            return;
         }

         // @Cleanup: Copy and paste
         const event: EntityTickEvent<EntityTickEventType.fireBow> = {
            entityID: tribeMember,
            type: EntityTickEventType.fireBow,
            data: item.type
         };
         registerEntityTickEvent(tribeMember, event);

         // Offset the arrow's spawn to be just outside of the tribe member's hitbox
         // @Speed: Garbage collection
         const spawnPosition = transformComponent.position.copy();
         const offset = Point.fromVectorForm(35, transformComponent.rotation);
         spawnPosition.add(offset);
         
         const itemInfo = ITEM_INFO_RECORD[item.type] as BowItemInfo;

         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         // @Copynpaste from bow above
         const config = createWoodenArrowConfig(tribeComponent.tribe, tribeMember);
         config.components[ServerComponentType.transform].position.x = spawnPosition.x;
         config.components[ServerComponentType.transform].position.y = spawnPosition.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         config.components[ServerComponentType.physics].externalVelocity.x = itemInfo.projectileSpeed * Math.sin(transformComponent.rotation);
         config.components[ServerComponentType.physics].externalVelocity.y = itemInfo.projectileSpeed * Math.cos(transformComponent.rotation);
         createEntity(config, getEntityLayer(tribeMember), 0);

         delete useInfo.crossbowLoadProgressRecord[itemSlot];
         
         break;
      }
      case "spear": {
         // 
         // Throw the spear
         // 

         const transformComponent = TransformComponentArray.getComponent(tribeMember);
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         const entityPhysicsComponent = PhysicsComponentArray.getComponent(tribeMember);
         
         const inventory = getInventory(inventoryComponent, inventoryName);
         const limbInfo = inventoryUseComponent.getLimbInfo(inventoryName);

         const offsetDirection = transformComponent.rotation + Math.PI / 1.5 - Math.PI / 14;
         const x = transformComponent.position.x + 35 * Math.sin(offsetDirection);
         const y = transformComponent.position.y + 35 * Math.cos(offsetDirection);

         const secondsSinceLastAction = limbInfo.currentActionElapsedTicks / Settings.TPS;
         const velocityMagnitude = lerp(1000, 1700, Math.min(secondsSinceLastAction / 3, 1));

         const config = createSpearProjectileConfig(tribeMember, null);
         config.components[ServerComponentType.transform].position.x = x;
         config.components[ServerComponentType.transform].position.y = y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         config.components[ServerComponentType.physics].externalVelocity.x = entityPhysicsComponent.selfVelocity.x + entityPhysicsComponent.externalVelocity.x + velocityMagnitude * Math.sin(transformComponent.rotation);
         config.components[ServerComponentType.physics].externalVelocity.y = entityPhysicsComponent.selfVelocity.y + entityPhysicsComponent.externalVelocity.y + velocityMagnitude * Math.cos(transformComponent.rotation);
         createEntity(config, getEntityLayer(tribeMember), 0);

         consumeItemFromSlot(tribeMember, inventory, itemSlot, 1);

         // Once thrown, the limb goes back to doing nothing
         limbInfo.action = LimbAction.none;

         break;
      }
      case "battleaxe": {
         // 
         // Throw the battleaxe
         // 

         const transformComponent = TransformComponentArray.getComponent(tribeMember);
         const physicsComponent = PhysicsComponentArray.getComponent(tribeMember);
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const useInfo = inventoryUseComponent.getLimbInfo(inventoryName);

         const offsetDirection = transformComponent.rotation + Math.PI / 1.5 - Math.PI / 14;
         const x = transformComponent.position.x + 35 * Math.sin(offsetDirection);
         const y = transformComponent.position.y + 35 * Math.cos(offsetDirection);

         const ticksSinceLastAction = getGameTicks() - useInfo.lastBattleaxeChargeTicks;
         const secondsSinceLastAction = ticksSinceLastAction / Settings.TPS;
         const velocityMagnitude = lerp(600, 1100, Math.min(secondsSinceLastAction / 3, 1));

         const config = createBattleaxeProjectileConfig(tribeComponent.tribe, tribeMember, item.id);
         config.components[ServerComponentType.transform].position.x = x;
         config.components[ServerComponentType.transform].position.y = y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         config.components[ServerComponentType.physics].externalVelocity.x = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x + velocityMagnitude * Math.sin(transformComponent.rotation)
         config.components[ServerComponentType.physics].externalVelocity.y = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y + velocityMagnitude * Math.cos(transformComponent.rotation)
         createEntity(config, getEntityLayer(tribeMember), 0);

         useInfo.lastBattleaxeChargeTicks = getGameTicks();
         useInfo.thrownBattleaxeItemID = item.id;
         
         break;
      }
   }
}

export function tribeMemberCanPickUpItem(tribeMember: Entity, itemType: ItemType): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);

   if (!inventoryIsFull(inventory)) {
      return true;
   }
   
   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];

      if (item.type === itemType && itemIsStackable(item.type) && item.count < getItemStackSize(item)) {
         return true;
      }
   }

   return false;
}

export function entityIsTribesman(entityType: EntityType): boolean {
   return entityType === EntityType.player || entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior;
}

export function wasTribeMemberKill(attackingEntity: Entity | null): boolean {
   return attackingEntity !== null && TribeComponentArray.hasComponent(attackingEntity);
}

const blueprintTypeMatchesBuilding = (structure: Entity, blueprintType: BlueprintType): boolean => {
   const materialComponent = BuildingMaterialComponentArray.getComponent(structure);

   const entityType = getEntityType(structure);
   
   if (entityType === EntityType.wall) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneWall || blueprintType === BlueprintType.woodenDoor || blueprintType === BlueprintType.woodenEmbrasure || blueprintType === BlueprintType.woodenTunnel;
         case BuildingMaterial.stone: return blueprintType === BlueprintType.stoneDoor || blueprintType === BlueprintType.stoneEmbrasure || blueprintType === BlueprintType.stoneTunnel;
      }
   }

   if (entityType === EntityType.door) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneDoorUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.embrasure) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneEmbrasureUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.tunnel) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneTunnelUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.floorSpikes) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneFloorSpikes;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.wallSpikes) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneWallSpikes;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.workerHut) {
      return blueprintType === BlueprintType.warriorHutUpgrade;
   }

   if (entityType === EntityType.fence) {
      return blueprintType === BlueprintType.fenceGate;
   }

   if (entityType === EntityType.bracings) {
      return blueprintType === BlueprintType.stoneBracings;
   }

   return false;
}

const getFenceGatePlaceDirection = (fence: Entity): number => {
   const structureComponent = StructureComponentArray.getComponent(fence);

   // Fence gates always have two connections on their left and right, so we simply add 90deg to
   // the direction of one of the connections.

   const connection = structureComponent.connections[0];

   const transformComponent = TransformComponentArray.getComponent(fence);
   const connectingFenceTransformComponent = TransformComponentArray.getComponent(connection.entity);

   let direction = transformComponent.position.calculateAngleBetween(connectingFenceTransformComponent.position);
   return direction + Math.PI * 0.5;
}

export function placeBlueprint(tribeMember: Entity, structure: Entity, blueprintType: BlueprintType, dynamicRotation: number): void {
   if (!blueprintTypeMatchesBuilding(structure, blueprintType)) {
      return;
   }

   const structureTransformComponent = TransformComponentArray.getComponent(structure);
   
   // @Cleanup
   switch (blueprintType) {
      case BlueprintType.woodenEmbrasure:
      case BlueprintType.woodenDoor:
      case BlueprintType.woodenTunnel:
      case BlueprintType.stoneDoor:
      case BlueprintType.stoneEmbrasure:
      case BlueprintType.stoneTunnel: {
         const position = structureTransformComponent.position.copy();
         if (blueprintType === BlueprintType.woodenEmbrasure || blueprintType === BlueprintType.stoneEmbrasure) {
            position.x += 22 * Math.sin(dynamicRotation);
            position.y += 22 * Math.cos(dynamicRotation);
         }
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig(tribeComponent.tribe, blueprintType, 0, null);
         config.components[ServerComponentType.transform].position.x = position.x;
         config.components[ServerComponentType.transform].position.y = position.y;
         config.components[ServerComponentType.transform].rotation = dynamicRotation;
         createEntity(config, getEntityLayer(tribeMember), 0);
         
         destroyEntity(structure);
         break;
      }
      case BlueprintType.stoneDoorUpgrade:
      case BlueprintType.stoneEmbrasureUpgrade:
      case BlueprintType.stoneTunnelUpgrade:
      case BlueprintType.stoneFloorSpikes:
      case BlueprintType.stoneWallSpikes:
      case BlueprintType.stoneWall:
      case BlueprintType.stoneBracings: {
         const materialComponent = BuildingMaterialComponentArray.getComponent(structure);
         const upgradeMaterialItemType = MATERIAL_TO_ITEM_MAP[(materialComponent.material + 1) as BuildingMaterial];
         
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         if (countItemType(inventoryComponent, upgradeMaterialItemType) < 5) {
            return;
         }

         // Upgrade

         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig(tribeComponent.tribe, blueprintType, structure, null);
         config.components[ServerComponentType.transform].position.x = structureTransformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = structureTransformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = structureTransformComponent.rotation;
         createEntity(config, getEntityLayer(tribeMember), 0);
         
         consumeItemType(tribeMember, inventoryComponent, upgradeMaterialItemType, 5);
         break;
      }
      case BlueprintType.warriorHutUpgrade: {
         // @Cleanup: copy and paste

         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         if (countItemType(inventoryComponent, ItemType.rock) < 25 || countItemType(inventoryComponent, ItemType.wood) < 15) {
            return;
         }

         // Upgrade

         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig(tribeComponent.tribe, blueprintType, structure, null);
         config.components[ServerComponentType.transform].position.x = structureTransformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = structureTransformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = structureTransformComponent.rotation;
         createEntity(config, getEntityLayer(tribeMember), 0);

         consumeItemType(tribeMember, inventoryComponent, ItemType.rock, 25);
         consumeItemType(tribeMember, inventoryComponent, ItemType.wood, 15);

         break;
      }
      case BlueprintType.fenceGate: {
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         if (countItemType(inventoryComponent, ItemType.wood) < 5) {
            return;
         }

         let rotation = getFenceGatePlaceDirection(structure);

         // Make rotation face away from player
         const transformComponent = TransformComponentArray.getComponent(tribeMember);
         if (dotAngles(rotation, transformComponent.rotation) < 0) {
            rotation = rotation + Math.PI;
         }
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig(tribeComponent.tribe, blueprintType, structure, null);
         config.components[ServerComponentType.transform].position.x = structureTransformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = structureTransformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = rotation;
         createEntity(config, getEntityLayer(tribeMember), 0);

         consumeItemType(tribeMember, inventoryComponent, ItemType.wood, 5);
      }
   }
}

export function getAvailableCraftingStations(tribeMember: Entity): ReadonlyArray<CraftingStation> {
   const transformComponent = TransformComponentArray.getComponent(tribeMember);
   const layer = getEntityLayer(tribeMember);
   
   const minChunkX = Math.max(Math.floor((transformComponent.position.x - Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((transformComponent.position.x + Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((transformComponent.position.y - Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((transformComponent.position.y + Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const availableCraftingStations = new Array<CraftingStation>();

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            
            const distance = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
            if (distance > Settings.MAX_CRAFTING_STATION_USE_DISTANCE) {
               continue;
            }

            switch (getEntityType(entity)) {
               case EntityType.workbench: {
                  if (!availableCraftingStations.includes(CraftingStation.workbench)) {
                     availableCraftingStations.push(CraftingStation.workbench);
                  }
                  break;
               }
               case EntityType.slime: {
                  if (!availableCraftingStations.includes(CraftingStation.slime)) {
                     availableCraftingStations.push(CraftingStation.slime);
                  }
                  break;
               }
            }
         }
      }
   }

   return availableCraftingStations;
}

// @Cleanup: why need 2?

export function onTribeMemberCollision(tribesman: Entity, collidingEntity: Entity): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.berryBush || collidingEntityType === EntityType.tree) {
      const tribesmanComponent = TribesmanComponentArray.getComponent(tribesman);
      tribesmanComponent.lastPlantCollisionTicks = getGameTicks();
   }
}

export function throwItem(tribesman: Entity, inventoryName: InventoryName, itemSlot: number, dropAmount: number, throwDirection: number): void {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const inventory = getInventory(inventoryComponent, inventoryName);

   const item = inventory.itemSlots[itemSlot];
   if (typeof item === "undefined") {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanPhysicsComponent = PhysicsComponentArray.getComponent(tribesman);
   
   const itemType = item.type;
   const amountRemoved = consumeItemFromSlot(tribesman, inventory, itemSlot, dropAmount);

   const dropPosition = transformComponent.position.copy();
   dropPosition.x += Vars.ITEM_THROW_OFFSET * Math.sin(throwDirection);
   dropPosition.y += Vars.ITEM_THROW_OFFSET * Math.cos(throwDirection);

   // Create the item entity
   const config = createItemEntityConfig(itemType, amountRemoved, tribesman);
   config.components[ServerComponentType.transform].position.x = dropPosition.x;
   config.components[ServerComponentType.transform].position.y = dropPosition.y;
   config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   // Throw the dropped item away from the player
   config.components[ServerComponentType.physics].externalVelocity.x = tribesmanPhysicsComponent.selfVelocity.x + tribesmanPhysicsComponent.externalVelocity.x + Vars.ITEM_THROW_FORCE * Math.sin(throwDirection);
   config.components[ServerComponentType.physics].externalVelocity.y = tribesmanPhysicsComponent.selfVelocity.y + tribesmanPhysicsComponent.externalVelocity.y + Vars.ITEM_THROW_FORCE * Math.cos(throwDirection);
   createEntity(config, getEntityLayer(tribesman), 0);

   if (TribesmanAIComponentArray.hasComponent(tribesman)) {
      const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
      tribesmanComponent.lastItemThrowTicks = getGameTicks();
   }
}