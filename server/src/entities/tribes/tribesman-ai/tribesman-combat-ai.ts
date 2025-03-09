import { TribesmanAIType } from "battletribes-shared/components";
import { Entity, EntityType, LimbAction } from "battletribes-shared/entities";
import { Settings, PathfindingSettings } from "battletribes-shared/settings";
import { Point, distance } from "battletribes-shared/utils";
import { getDistanceFromPointToEntity, entityIsInLineOfSight, willStopAtDesiredDistance } from "../../../ai-shared";
import { InventoryComponentArray, getInventory } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, limbHeldItemCanBeSwitched, setLimbActions } from "../../../components/InventoryUseComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { calculateItemDamage, useItem } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { TribeComponentArray } from "../../../components/TribeComponent";
import { calculateAttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { clearTribesmanPath, getBestToolItemSlot, getTribesmanDesiredAttackRange, getHumanoidRadius, getTribesmanSlowAcceleration, pathfindTribesman, pathToEntityExists } from "./tribesman-ai-utils";
import { attemptToRepairBuildings } from "./tribesman-structures";
import { InventoryName, ITEM_TYPE_RECORD, getItemAttackInfo, Item } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { getEntityAgeTicks, getEntityLayer, getEntityType, getGameTicks } from "../../../world";
import { beginSwing } from "../limb-use";
import { TribeType } from "../../../../../shared/src/tribes";
import { applyAcceleration, Hitbox, setHitboxIdealAngle } from "../../../hitboxes";

const enum Vars {
   BOW_LINE_OF_SIGHT_WAIT_TIME = 0.5 * Settings.TPS,
   EMBRASURE_USE_RADIUS = 40,
   BATTLEAXE_MIN_USE_RANGE = 120,
   BATTLEAXE_IDEAL_USE_RANGE = 260,
   BATTLEAXE_MAX_USE_RANGE = 400,
   DESIRED_RANGED_ATTACK_DISTANCE = 360
}

// @Incomplete?
const EXTRA_BOW_COOLDOWNS: Partial<Record<EntityType, number>> = {
   [EntityType.tribeWorker]: Math.floor(0.3 * Settings.TPS),
   [EntityType.tribeWarrior]: Math.floor(0.1 * Settings.TPS)
};

export function doMeleeAttack(tribesman: Entity, itemSlot: number): void {
   beginSwing(tribesman, itemSlot, InventoryName.hotbar);

   // Barbarians can attack with offhand
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
      beginSwing(tribesman, 1, InventoryName.offhand);
   }
}

const getItemAttackExecuteTimeSeconds = (item: Item): number => {
   const attackInfo = getItemAttackInfo(item.type);
   const timings = attackInfo.attackTimings;
   return (timings.windupTimeTicks + timings.swingTimeTicks + timings.returnTimeTicks) / Settings.TPS;
}

const getMostDamagingItemSlot = (tribesman: Entity, huntedEntity: Entity): number => {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   // @Incomplete: Account for status effects
   
   let bestItemSlot = 1;
   let mostDps = 0;
   for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
      const item = hotbarInventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         if (mostDps < 1 / Settings.DEFAULT_ATTACK_COOLDOWN) {
            mostDps = 1 / Settings.DEFAULT_ATTACK_COOLDOWN;
            bestItemSlot = itemSlot;
         }
         continue;
      }

      const attackEffectiveness = calculateAttackEffectiveness(item, getEntityType(huntedEntity));
      
      const attackExecuteTimeSeconds = getItemAttackExecuteTimeSeconds(item);
      const damage = calculateItemDamage(tribesman, item, attackEffectiveness, false);
      const dps = damage / attackExecuteTimeSeconds;

      if (dps > mostDps) {
         mostDps = dps;
         bestItemSlot = itemSlot;
      }
   }

   return bestItemSlot;
}

const getNearbyEmbrasureUsePoints = (tribesman: Entity): ReadonlyArray<Point> => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.children[0] as Hitbox;
   
   const layer = getEntityLayer(tribesman);
   
   // Add 30 to the range to account for the fact that use points are disconnected from the embrasure positions
   const minChunkX = Math.max(Math.floor((tribesmanHitbox.box.position.x - (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((tribesmanHitbox.box.position.x + (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((tribesmanHitbox.box.position.y - (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((tribesmanHitbox.box.position.y + (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const usePoints = new Array<Point>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (getEntityType(entity) !== EntityType.embrasure) {
               continue;
            }

            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = entityTransformComponent.children[0] as Hitbox;

            const usePointX = entityHitbox.box.position.x - 22 * Math.sin(entityHitbox.box.angle);
            const usePointY = entityHitbox.box.position.y - 22 * Math.cos(entityHitbox.box.angle);

            if (distance(tribesmanHitbox.box.position.x, tribesmanHitbox.box.position.y, usePointX, usePointY) <= Vars.EMBRASURE_USE_RADIUS) {
               usePoints.push(new Point(usePointX, usePointY));
            }
         }
      }
   }

   return usePoints;
}

const getClosestEmbrasureUsePoint = (tribesman: Entity, usePoints: ReadonlyArray<Point>): Point => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.children[0] as Hitbox;

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestPoint!: Point;
   for (let i = 0; i < usePoints.length; i++) {
      const point = usePoints[i];

      const dist = tribesmanHitbox.box.position.calculateDistanceBetween(point);
      if (dist < minDist) {
         minDist = dist;
         closestPoint = point;
      }
   }

   return closestPoint;
}

export function goKillEntity(tribesman: Entity, huntedEntity: Entity, isAggressive: boolean): void {
   // @Cleanup: Refactor to not be so big
   
   // @Incomplete: Only accounts for hotbar

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.children[0] as Hitbox;
   
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);

   const huntedEntityTransformComponent = TransformComponentArray.getComponent(huntedEntity);
   const huntedHitbox = huntedEntityTransformComponent.children[0] as Hitbox;
   
   const mostDamagingItemSlot = getMostDamagingItemSlot(tribesman, huntedEntity);

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   const hotbarLimb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   
   // Select the item slot
   if (hotbarLimb.selectedItemSlot !== mostDamagingItemSlot && limbHeldItemCanBeSwitched(hotbarLimb)) {
      hotbarLimb.selectedItemSlot = mostDamagingItemSlot;
   }
   
   const hotbar = getInventory(inventoryComponent, InventoryName.hotbar);
   if (hotbar.hasItem(mostDamagingItemSlot) && hotbarLimb.selectedItemSlot === mostDamagingItemSlot) {
      const selectedItem = hotbar.itemSlots[hotbarLimb.selectedItemSlot]!;
      const weaponCategory = ITEM_TYPE_RECORD[selectedItem.type];

      // Throw spears if there is multiple
      if (weaponCategory === "spear" && selectedItem.count > 1) {
         // Rotate to face the target
         const targetAngle = tribesmanHitbox.box.position.calculateAngleBetween(huntedHitbox.box.position);
         setHitboxIdealAngle(tribesmanHitbox, targetAngle, TRIBESMAN_TURN_SPEED);

         const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, huntedEntityTransformComponent) - getHumanoidRadius(transformComponent);
         if (distance > 250) {
            // Move closer
            const accelerationX = getTribesmanSlowAcceleration(tribesman) * Math.sin(targetAngle);
            const accelerationY = getTribesmanSlowAcceleration(tribesman) * Math.cos(targetAngle);
            applyAcceleration(tribesman, tribesmanHitbox, accelerationX, accelerationY);
         } else if (distance <= 150) {
            // Backpedal away from the entity if too close
            const backwards = targetAngle + Math.PI;
            const accelerationX = getTribesmanSlowAcceleration(tribesman) * Math.sin(backwards);
            const accelerationY = getTribesmanSlowAcceleration(tribesman) * Math.cos(backwards);
            applyAcceleration(tribesman, tribesmanHitbox, accelerationX, accelerationY);
         }

         if (hotbarLimb.action !== LimbAction.chargeSpear) {
            hotbarLimb.lastSpearChargeTicks = getGameTicks();
         }
         
         const ticksSinceLastAction = getGameTicks() - hotbarLimb.lastSpearChargeTicks;
         if (ticksSinceLastAction >= 3 * Settings.TPS) {
            // Throw spear
            useItem(tribesman, selectedItem, InventoryName.hotbar, hotbarLimb.selectedItemSlot);
            setLimbActions(inventoryUseComponent, LimbAction.none);
         } else {
            // Charge spear
            hotbarLimb.action = LimbAction.chargeSpear;
         }

         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
         tribesmanComponent.currentAIType = TribesmanAIType.attacking;
         return;
      }
      
      // Don't do a melee attack if using a bow, instead charge the bow
      if (weaponCategory === "bow") {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
         tribesmanComponent.currentAIType = TribesmanAIType.attacking;

         const tribeComponent = TribeComponentArray.getComponent(tribesman);
         
         const isInLineOfSight = entityIsInLineOfSight(tribesman, huntedEntity, tribeComponent.tribe.pathfindingGroupID);
         if (isInLineOfSight) {
            tribesmanComponent.lastEnemyLineOfSightTicks = getGameTicks();
         }
         
         if (isInLineOfSight || (getGameTicks() - tribesmanComponent.lastEnemyLineOfSightTicks) <= Vars.BOW_LINE_OF_SIGHT_WAIT_TIME) {
            const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, huntedEntityTransformComponent) - getHumanoidRadius(transformComponent);
            
            // If there are any nearby embrasure use points, move to them
            const nearbyEmbrasureUsePoints = getNearbyEmbrasureUsePoints(tribesman);
            if (nearbyEmbrasureUsePoints.length > 0) {
               // Move to the closest one
               const targetUsePoint = getClosestEmbrasureUsePoint(tribesman, nearbyEmbrasureUsePoints);
               
               const moveDirection = tribesmanHitbox.box.position.calculateAngleBetween(targetUsePoint);
               const accelerationX = getTribesmanSlowAcceleration(tribesman) * Math.sin(moveDirection);
               const accelerationY = getTribesmanSlowAcceleration(tribesman) * Math.cos(moveDirection);
               applyAcceleration(tribesman, tribesmanHitbox, accelerationX, accelerationY);
            } else if (willStopAtDesiredDistance(tribesmanHitbox, Vars.DESIRED_RANGED_ATTACK_DISTANCE - 20, distance)) {
               // If the tribesman will stop too close to the target, move back a bit
               const accelerationX = getTribesmanSlowAcceleration(tribesman) * Math.sin(tribesmanHitbox.box.angle + Math.PI);
               const accelerationY = getTribesmanSlowAcceleration(tribesman) * Math.cos(tribesmanHitbox.box.angle + Math.PI);
               applyAcceleration(tribesman, tribesmanHitbox, accelerationX, accelerationY);
            }

            const targetAngle = tribesmanHitbox.box.position.calculateAngleBetween(huntedHitbox.box.position);
            setHitboxIdealAngle(tribesmanHitbox, targetAngle, TRIBESMAN_TURN_SPEED);

            // @Incomplete!
            // if (hotbarUseInfo.action !== LimbAction.chargeBow) {
            //    // If the tribesman is only just charging the bow, reset the cooldown to prevent the bow firing immediately
            //    const itemInfo = ITEM_INFO_RECORD[selectedItem.type] as BowItemInfo;
            //    hotbarUseInfo.lastBowChargeTicks = Board.ticks;
            //    hotbarUseInfo.bowCooldownTicks = itemInfo.shotCooldownTicks;
            //    tribesmanComponent.extraBowCooldownTicks = EXTRA_BOW_COOLDOWNS[Board.getEntityType(tribesman)]!;
            // } else if (hotbarUseInfo.bowCooldownTicks === 0 && tribesmanComponent.extraBowCooldownTicks > 0) {
            //    tribesmanComponent.extraBowCooldownTicks--;
            // } else {
            //    // If the bow is fully charged, fire it
            //    useItem(tribesman, selectedItem, InventoryName.hotbar, hotbarUseInfo.selectedItemSlot);
            //    tribesmanComponent.extraBowCooldownTicks = EXTRA_BOW_COOLDOWNS[Board.getEntityType(tribesman)]!;
            // }
            hotbarLimb.action = LimbAction.chargeBow;

            clearTribesmanPath(tribesman);
         } else {
            const isFinished = pathfindTribesman(tribesman, huntedHitbox.box.position.x, huntedHitbox.box.position.y, getEntityLayer(huntedEntity), huntedEntity, TribesmanPathType.default, Math.floor(100 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest);

            // If reached goal, turn towards the enemy
            if (isFinished) {
               const targetAngle = tribesmanHitbox.box.position.calculateAngleBetween(huntedHitbox.box.position);
               setHitboxIdealAngle(tribesmanHitbox, targetAngle, TRIBESMAN_TURN_SPEED);
            }
         }

         return;
      }

      if (isAggressive && weaponCategory === "battleaxe") {
         // Use the battleaxe if the entity is in the use range
         const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, huntedEntityTransformComponent) - getHumanoidRadius(transformComponent);
         if (distance >= Vars.BATTLEAXE_MIN_USE_RANGE && distance <= Vars.BATTLEAXE_MAX_USE_RANGE && selectedItem.id !== hotbarLimb.thrownBattleaxeItemID) {
            if (hotbarLimb.action !== LimbAction.chargeBattleaxe) {
               hotbarLimb.lastBattleaxeChargeTicks = getGameTicks();
            }

            const targetAngle = tribesmanHitbox.box.position.calculateAngleBetween(huntedHitbox.box.position);
            setHitboxIdealAngle(tribesmanHitbox, targetAngle, TRIBESMAN_TURN_SPEED);

            if (distance > Vars.BATTLEAXE_IDEAL_USE_RANGE + 10) {
               // Move closer
               const acceleration = getTribesmanSlowAcceleration(tribesman);
               const accelerationX = acceleration * Math.sin(targetAngle);
               const accelerationY = acceleration * Math.cos(targetAngle);
               applyAcceleration(tribesman, tribesmanHitbox, accelerationX, accelerationY);
            } else if (distance < Vars.BATTLEAXE_IDEAL_USE_RANGE - 10) {
               // Move futher away
               const acceleration = getTribesmanSlowAcceleration(tribesman);
               const moveDirection = targetAngle + Math.PI;
               const accelerationX = acceleration * Math.sin(moveDirection);
               const accelerationY = acceleration * Math.cos(moveDirection);
               applyAcceleration(tribesman, tribesmanHitbox, accelerationX, accelerationY);
            }

            const ticksSinceLastAction = getGameTicks() - hotbarLimb.lastBattleaxeChargeTicks;
            if (ticksSinceLastAction >= 3 * Settings.TPS) {
               // Throw the battleaxe
               useItem(tribesman, selectedItem, InventoryName.hotbar, mostDamagingItemSlot);
               setLimbActions(inventoryUseComponent, LimbAction.none);
            } else {
               setLimbActions(inventoryUseComponent, LimbAction.chargeBattleaxe);
            }
            
            const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
            tribesmanComponent.currentAIType = TribesmanAIType.attacking;

            clearTribesmanPath(tribesman);
            return;
         }
      }
   }

   // @Cleanup: Shouldn't be done here. Just skip out of this function and let the main path do the repairing.
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const hammerItemSlot = getBestToolItemSlot(hotbarInventory, "hammer");
   if (hammerItemSlot !== null) {
      // If there isn't a path to the entity, try to repair buildings
      // @Incomplete: This will cause a delay after the tribesman finishes repairing the building.
      const ageTicks = getEntityAgeTicks(tribesman);
      if (ageTicks % (Settings.TPS / 2) === 0) {
         const pathExists = pathToEntityExists(tribesman, huntedEntity, getHumanoidRadius(transformComponent));
         if (!pathExists) {
            const isRepairing = attemptToRepairBuildings(tribesman, hammerItemSlot);
            if (isRepairing) {
               return;
            }
         }
      } else {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
         if (tribesmanComponent.currentAIType === TribesmanAIType.repairing) {
            const isRepairing = attemptToRepairBuildings(tribesman, hammerItemSlot);
            if (isRepairing) {
               return;
            }
         }
      }
   }

   const desiredAttackRange = getTribesmanDesiredAttackRange(tribesman);

   const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, huntedEntityTransformComponent) - getHumanoidRadius(transformComponent);
   if (willStopAtDesiredDistance(tribesmanHitbox, desiredAttackRange, distance)) {
      // If the tribesman will stop too close to the target, move back a bit
      if (willStopAtDesiredDistance(tribesmanHitbox, desiredAttackRange - 20, distance)) {
         const accelerationX = getTribesmanSlowAcceleration(tribesman) * Math.sin(tribesmanHitbox.box.angle + Math.PI);
         const accelerationY = getTribesmanSlowAcceleration(tribesman) * Math.cos(tribesmanHitbox.box.angle + Math.PI);
         applyAcceleration(tribesman, tribesmanHitbox, accelerationX, accelerationY);
      }

      const targetAngle = tribesmanHitbox.box.position.calculateAngleBetween(huntedHitbox.box.position);
      setHitboxIdealAngle(tribesmanHitbox, targetAngle, TRIBESMAN_TURN_SPEED);
   
      // If in melee range, try to do a melee attack
      doMeleeAttack(tribesman, mostDamagingItemSlot);

      clearTribesmanPath(tribesman);
   } else {
      const pointDistance = tribesmanHitbox.box.position.calculateDistanceBetween(huntedHitbox.box.position);
      const targetDirectRadius = pointDistance - distance;

      const goalRadius = Math.floor((desiredAttackRange + targetDirectRadius) / PathfindingSettings.NODE_SEPARATION);
      // @Temporary?
      // const failureDefault = isAggressive ? PathfindFailureDefault.returnClosest : PathfindFailureDefault.throwError;
      const failureDefault = isAggressive ? PathfindFailureDefault.returnClosest : PathfindFailureDefault.none;
      pathfindTribesman(tribesman, huntedHitbox.box.position.x, huntedHitbox.box.position.y, getEntityLayer(huntedEntity), huntedEntity, TribesmanPathType.default, goalRadius, failureDefault);
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanComponent.currentAIType = TribesmanAIType.attacking;
}