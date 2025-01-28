import { TribesmanAIType } from "battletribes-shared/components";
import { Entity, EntityType, LimbAction } from "battletribes-shared/entities";
import { PathfindingSettings } from "battletribes-shared/settings";
import { calculateEntityPlaceInfo, STRUCTURE_TYPE_TO_ENTITY_TYPE_RECORD } from "battletribes-shared/structures";
import { TribesmanTitle } from "battletribes-shared/titles";
import { angle, assert, getAbsAngleDiff, getAngleDiff } from "battletribes-shared/utils";
import Tribe from "../../../Tribe";
import { getDistanceFromPointToEntity, stopEntity, willStopAtDesiredDistance } from "../../../ai-shared";
import { HealthComponentArray } from "../../../components/HealthComponent";
import { consumeItemFromSlot, InventoryComponentArray, getInventory, getItemTypeSlot, inventoryHasItemType } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { getEntityRelationship, EntityRelationship, TribeComponentArray } from "../../../components/TribeComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { TITLE_REWARD_CHANCES } from "../../../tribesman-title-generation";
import { placeStructure, placeBlueprint } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { getBestToolItemSlot, getTribesmanAttackRadius, getTribesmanDesiredAttackRange, getHumanoidRadius, getTribesmanSlowAcceleration, pathfindTribesman, clearTribesmanPath } from "./tribesman-ai-utils";
import { doMeleeAttack, huntEntity } from "./tribesman-combat-ai";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent";
import { getBoxesCollidingEntities } from "battletribes-shared/hitbox-collision";
import { Inventory, InventoryName, ItemType } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { getEntityLayer, getEntityType, getGameTicks } from "../../../world";
import { getLayerInfo } from "../../../layers";
import { AIPlaceBuildingPlan, AIUpgradeBuildingPlan, planToGetItem } from "../../../tribesman-ai/tribesman-ai-planning";
import { addAssignmentPart, AIAssignmentComponentArray } from "../../../components/AIAssignmentComponent";
import { awardTitle } from "../../../components/TribesmanComponent";

const enum Vars {
   BUILDING_PLACE_DISTANCE = 80
}

const getPlaceableItemSlot = (hotbarInventory: Inventory, itemType: ItemType): number | null => {
   return getItemTypeSlot(hotbarInventory, itemType);
}

export function goPlaceBuilding(tribesman: Entity, hotbarInventory: Inventory, tribe: Tribe, plan: AIPlaceBuildingPlan): boolean {
   const virtualBuilding = plan.virtualBuilding;
   
   const layer = getEntityLayer(tribesman);
   const blockingEntities = getBoxesCollidingEntities(getLayerInfo(layer), virtualBuilding.hitboxes);
   for (let i = 0; i < blockingEntities.length; i++) {
      const blockingEntity = blockingEntities[i];
      if (!HealthComponentArray.hasComponent(blockingEntity)) {
         continue;
      }
      
      const relationship = getEntityRelationship(tribesman, blockingEntity);
      if (relationship !== EntityRelationship.friendly) {
         // @Bug: sometimes the blocking entity is inaccessible, causing the pathfinding to the entity to break. Fix
         
         // If the entity is a boulder, ensure that the tribesman has a pickaxe so that it can damage it
         // @Hack: hardcoded
         if (getEntityType(blockingEntity) === EntityType.boulder) {
            const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
            // @Hack: this is shit, only checks for wooden pickaxe, but it's just a start. improve layer.
            const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
            if (!inventoryHasItemType(hotbarInventory, ItemType.wooden_pickaxe)) {
               const tribeComponent = TribeComponentArray.getComponent(tribesman);
               const assignment = planToGetItem(tribeComponent.tribe, ItemType.wooden_pickaxe, 1);
               
               const aiAssignmentComponent = AIAssignmentComponentArray.getComponent(tribesman);
               addAssignmentPart(aiAssignmentComponent, assignment);
               // @Bug: the entity will do nothing this tick...
               return false;
            }
         }
         
         huntEntity(tribesman, blockingEntity, false);
         return false;
      }
   }

   // @Hack?
   const placeableItemType = STRUCTURE_TYPE_TO_ENTITY_TYPE_RECORD[virtualBuilding.entityType];
   const placeableItemSlot = getPlaceableItemSlot(hotbarInventory, placeableItemType);
   assert(placeableItemSlot !== null);
   
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   
   const distance = getDistanceFromPointToEntity(virtualBuilding.position, tribesman);
   if (distance < Vars.BUILDING_PLACE_DISTANCE) {
      // Equip the item
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
      const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
      useInfo.selectedItemSlot = placeableItemSlot;
      
      const transformComponent = TransformComponentArray.getComponent(tribesman);
      
      const targetDirection = angle(virtualBuilding.position.x - transformComponent.position.x, virtualBuilding.position.y - transformComponent.position.y);
      if (distance < getTribesmanAttackRadius(tribesman)) {
         // @Incomplete: Shouldn't move backwards from the target position, should instead pathfind to the closest position
         // which is far enough away, as currently it will try to back into buildings and get stuck like this.
         
         // 
         // If too close to the plan position, move back a bit
         // 

         const physicsComponent = PhysicsComponentArray.getComponent(tribesman);

         const acceleration = getTribesmanSlowAcceleration(tribesman);
         physicsComponent.acceleration.x = acceleration * Math.sin(targetDirection + Math.PI);
         physicsComponent.acceleration.y = acceleration * Math.cos(targetDirection + Math.PI);

         physicsComponent.targetRotation = targetDirection;
         physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
         
         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.building;
         return false;
      } else if (Math.abs(getAngleDiff(transformComponent.rotation, targetDirection)) < 0.02) {
         // @Cleanup: copy and paste. use the function from item-use.ts
         
         // 
         // Place the item
         // 
         
         const placeInfo = calculateEntityPlaceInfo(virtualBuilding.position, virtualBuilding.rotation, virtualBuilding.entityType, getLayerInfo(layer));
         placeStructure(tribe, layer, placeInfo);

         if (Math.random() < TITLE_REWARD_CHANCES.BUILDER_REWARD_CHANCE) {
            awardTitle(tribesman, TribesmanTitle.builder);
         }

         consumeItemFromSlot(tribesman, hotbarInventory, placeableItemSlot, 1);
         
         useInfo.lastAttackTicks = getGameTicks();
         return true;
      } else {
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
         
         stopEntity(physicsComponent);
         physicsComponent.targetRotation = targetDirection;
         physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.building;
         return false;
      }
   } else {
      // Move to the building plan
      const isFinished = pathfindTribesman(tribesman, virtualBuilding.position.x, virtualBuilding.position.y, virtualBuilding.layer, 0, TribesmanPathType.default, Math.floor(Vars.BUILDING_PLACE_DISTANCE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
      if (!isFinished) {
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
         
         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.building;
      }
      return false;
   }
}

export function goUpgradeBuilding(tribesman: Entity, plan: AIUpgradeBuildingPlan): void {
   const building = plan.baseBuildingID;
   
   // @Cleanup: Copy and paste from attemptToRepairBuildings
   
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const hammerItemSlot = getBestToolItemSlot(hotbarInventory, "hammer");
   if (hammerItemSlot === null) {
      console.warn("Tried to upgrade a building without a hammer.");
      return;
   }

   // Select the hammer item slot
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   useInfo.selectedItemSlot = hammerItemSlot;

   const desiredAttackRange = getTribesmanDesiredAttackRange(tribesman);
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
   
   const transformComponent = TransformComponentArray.getComponent(tribesman);

   const buildingTransformComponent = TransformComponentArray.getComponent(building);

   const distance = getDistanceFromPointToEntity(transformComponent.position, building) - getHumanoidRadius(transformComponent);
   if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange, distance)) {
      // If the tribesman will stop too close to the target, move back a bit
      if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange - 20, distance)) {
         physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman) * Math.sin(transformComponent.rotation + Math.PI);
         physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman) * Math.cos(transformComponent.rotation + Math.PI);
      } else {
         stopEntity(physicsComponent);
      }

      const targetRotation = transformComponent.position.calculateAngleBetween(buildingTransformComponent.position);

      physicsComponent.targetRotation = targetRotation;
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

      if (Math.abs(getAngleDiff(transformComponent.rotation, targetRotation)) < 0.1) {
         placeBlueprint(tribesman, building, plan.blueprintType, plan.rotation);
      }
   } else {
      pathfindTribesman(tribesman, buildingTransformComponent.position.x, buildingTransformComponent.position.y, getEntityLayer(building), building, TribesmanPathType.default, Math.floor(desiredAttackRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanComponent.currentAIType = TribesmanAIType.building;
}

export function attemptToRepairBuildings(tribesman: Entity, hammerItemSlot: number): boolean {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman);
   
   let closestDamagedBuilding: Entity | undefined;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const entity of aiHelperComponent.visibleEntities) {
      const relationship = getEntityRelationship(tribesman, entity);
      if (relationship !== EntityRelationship.friendlyBuilding) {
         continue;
      }

      const healthComponent = HealthComponentArray.getComponent(entity);
      if (healthComponent.health === healthComponent.maxHealth) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);

      // @Incomplete: Skip buildings which there isn't a path to

      const distance = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
      if (distance < minDistance) {
         closestDamagedBuilding = entity;
         minDistance = distance;
      }
   }

   if (typeof closestDamagedBuilding === "undefined") {
      return false;
   }

   // Select the hammer item slot
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   useInfo.selectedItemSlot = hammerItemSlot;

   const desiredAttackRange = getTribesmanDesiredAttackRange(tribesman);
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman);

   const buildingTransformComponent = TransformComponentArray.getComponent(closestDamagedBuilding);
   
   const distance = getDistanceFromPointToEntity(transformComponent.position, closestDamagedBuilding) - getHumanoidRadius(transformComponent);
   if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange, distance)) {
      // If the tribesman will stop too close to the target, move back a bit
      if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange - 20, distance)) {
         physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman) * Math.sin(transformComponent.rotation + Math.PI);
         physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman) * Math.cos(transformComponent.rotation + Math.PI);
      } else {
         stopEntity(physicsComponent);
      }

      const targetRotation = transformComponent.position.calculateAngleBetween(buildingTransformComponent.position);
      physicsComponent.targetRotation = targetRotation;
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

      if (getAbsAngleDiff(transformComponent.rotation, targetRotation) < 0.1) {
         doMeleeAttack(tribesman, hammerItemSlot);
      }

      clearTribesmanPath(tribesman);
   } else {
      pathfindTribesman(tribesman, buildingTransformComponent.position.x, buildingTransformComponent.position.y, getEntityLayer(closestDamagedBuilding), closestDamagedBuilding, TribesmanPathType.default, Math.floor(desiredAttackRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanComponent.currentAIType = TribesmanAIType.repairing;

   return true;
}