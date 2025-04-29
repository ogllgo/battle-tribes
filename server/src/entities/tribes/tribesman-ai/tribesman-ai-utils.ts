import { TribeComponentArray } from "../../../components/TribeComponent";
import { Entity, EntityType } from "battletribes-shared/entities";
import { TribesmanTitle } from "battletribes-shared/titles";
import { TRIBE_INFO_RECORD } from "battletribes-shared/tribes";
import { SpikesComponentArray } from "../../../components/SpikesComponent";
import { Inventory, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, HammerItemInfo } from "battletribes-shared/items/items";
import { TransformComponent, TransformComponentArray } from "../../../components/TransformComponent";
import { getEntityLayer, getEntityType, getGameTicks } from "../../../world";
import CircularBox from "../../../../../shared/src/boxes/CircularBox";
import { tribeMemberHasTitle, TribesmanComponentArray } from "../../../components/TribesmanComponent";
import { Hitbox } from "../../../hitboxes";

const enum Vars {
   ACCELERATION = 700,
   SLOW_ACCELERATION = 400
}

/** Max distance from the attack position that the attack will be registered from */
export function getTribesmanAttackRadius(tribesman: Entity): number {
   if (getEntityType(tribesman) === EntityType.tribeWorker) {
      return 35;
   } else {
      return 45;
   }
}

/** How far the tribesman wants to be away from their target when attacking */
export function getTribesmanDesiredAttackRange(tribesman: Entity): number {
   // @Incomplete: these shouldn't be hardcoded, they should be per-swing.
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const radius = getHumanoidRadius(transformComponent);
   return radius + 0;
}

/**
 * @param transformComponent The tribesman's transform component
 */
export function getHumanoidRadius(transformComponent: TransformComponent): number {
   return ((transformComponent.children[0] as Hitbox).box as CircularBox).radius;
}

const isCollidingWithCoveredSpikes = (tribesman: Entity): boolean => {
   const layer = getEntityLayer(tribesman);
   const collisionPairs = layer.getEntityCollisionPairs(tribesman);

   for (let i = 0; i < collisionPairs.length; i++) {
      const entityID = collisionPairs[i].collidingEntity;

      if (SpikesComponentArray.hasComponent(entityID)) {
         const spikesComponent = SpikesComponentArray.getComponent(entityID);
         if (spikesComponent.isCovered) {
            return true;
         }
      }
   }

   return false;
}

const getAccelerationMultiplier = (tribeMember: Entity): number => {
   const tribeComponent = TribeComponentArray.getComponent(tribeMember);
   
   let multiplier = TRIBE_INFO_RECORD[tribeComponent.tribe.tribeType].moveSpeedMultiplier;

   if (TribesmanComponentArray.hasComponent(tribeMember)) {
      const tribesmanComponent = TribesmanComponentArray.getComponent(tribeMember);
      
      // @Incomplete: only do when wearing the bush suit
      if (tribesmanComponent.lastPlantCollisionTicks >= getGameTicks() - 1) {
         multiplier *= 0.5;
      }
      
      if (tribeMemberHasTitle(tribesmanComponent, TribesmanTitle.sprinter)) {
         multiplier *= 1.2;
      }
   }

   if (isCollidingWithCoveredSpikes(tribeMember)) {
      multiplier *= 0.5;
   }

   return multiplier;
}

export function getTribesmanSlowAcceleration(tribesmanID: number): number {
   return Vars.SLOW_ACCELERATION * getAccelerationMultiplier(tribesmanID);
}

export function getTribesmanAcceleration(tribesmanID: number): number {
   return Vars.ACCELERATION * getAccelerationMultiplier(tribesmanID);
}

/* INVENTORY UTILS */

/** Returns 0 if no hammer is in the inventory */
export function getBestHammerItemSlot(inventory: Inventory): number | null {
   let bestRepairAmount = 0;
   let bestItemSlot: number | null = null;

   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];

      const itemCategory = ITEM_TYPE_RECORD[item.type];
      if (itemCategory === "hammer") {
         const itemInfo = ITEM_INFO_RECORD[item.type] as HammerItemInfo;
         if (itemInfo.repairAmount > bestRepairAmount) {
            bestRepairAmount = itemInfo.repairAmount;
            bestItemSlot = inventory.getItemSlot(item);
         }
      }
   }

   return bestItemSlot;
}