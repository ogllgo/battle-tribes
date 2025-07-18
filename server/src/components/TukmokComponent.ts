import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { getAbsAngleDiff, Point, polarVec2 } from "../../../shared/src/utils";
import { getDistanceFromPointToHitbox, willStopAtDesiredDistance } from "../ai-shared";
import { applyAcceleration, Hitbox } from "../hitboxes";
import { getEntityType } from "../world";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { getEntityFullness } from "./EnergyStomachComponent";
import { attachHitbox, TransformComponent, TransformComponentArray } from "./TransformComponent";

export class TukmokComponent {}

const IDEAL_DIST_FROM_TREE = 120;

export const TukmokComponentArray = new ComponentArray<TukmokComponent>(ServerComponentType.tukmok, true, getDataLength, addDataToPacket);
TukmokComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

const getTrunk = (transformComponent: TransformComponent): Entity => {
   for (const hitbox of transformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.tukmokTrunk) {
            return childHitbox.entity;
         }
      }
   }

   throw new Error();
}

const getTrunkHeadHitbox = (trunk: Entity): Hitbox => {
   const trunkTransformComponent = TransformComponentArray.getComponent(trunk);
   return trunkTransformComponent.hitboxes[trunkTransformComponent.hitboxes.length - 1];
}

const trunkHasLeaf = (trunk: Entity): boolean => {
   const trunkTransformComponent = TransformComponentArray.getComponent(trunk);
   for (const hitbox of trunkTransformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.itemEntity) {
            return true;
         }
      }
   }

   return false;
}

const moveTrunk = (trunk: Entity, targetPos: Point): void => {
   const trunkTransformComponent = TransformComponentArray.getComponent(trunk);
   for (let i = 0; i < trunkTransformComponent.hitboxes.length; i++) {
      const hitbox = trunkTransformComponent.hitboxes[i];

      const isHead = i === trunkTransformComponent.hitboxes.length - 1;
      const mag = 650 * (isHead ? 1 : 0.4);
      const acc = polarVec2(mag, hitbox.box.position.calculateAngleBetween(targetPos));
      applyAcceleration(hitbox, acc);
   }
}

const getTargetTree = (tukmok: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const hitbox = transformComponent.hitboxes[0];
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestTree: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (getEntityType(entity) !== EntityType.tree) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const dist = hitbox.box.position.calculateDistanceBetween(entityHitbox.box.position);
      if (dist < minDist) {
         closestTree = entity;
         minDist = dist;
      }
   }

   return closestTree;
}

function onTick(tukmok: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(tukmok);
   
   // Grab leaves from trees if hungry
   // @TEMPORARY: make less than 1
   if (getEntityFullness(tukmok) < 1) {
      const target = getTargetTree(tukmok, aiHelperComponent);
      if (target !== null) {
         const transformComponent = TransformComponentArray.getComponent(tukmok);
         const tukmokHeadHitbox = transformComponent.hitboxes[1];
         
         const targetTransformComponent = TransformComponentArray.getComponent(target);
         const targetHitbox = targetTransformComponent.hitboxes[0];
      
         const dist = getDistanceFromPointToHitbox(targetHitbox.box.position, tukmokHeadHitbox);
         if (willStopAtDesiredDistance(tukmokHeadHitbox, IDEAL_DIST_FROM_TREE - 8, dist)) {
            // Too close, move back a bit

            const awayFromTarget = targetHitbox.box.position.calculateAngleBetween(tukmokHeadHitbox.box.position);
            const awayPos = tukmokHeadHitbox.box.position.offset(999, awayFromTarget);
            aiHelperComponent.moveFunc(tukmok, awayPos, 100);
            aiHelperComponent.turnFunc(tukmok, targetHitbox.box.position, 1 * Math.PI, 0.6);
         } else if (willStopAtDesiredDistance(tukmokHeadHitbox, IDEAL_DIST_FROM_TREE, dist)) {
            // Close enough to grab

            aiHelperComponent.turnFunc(tukmok, targetHitbox.box.position, 1 * Math.PI, 0.6);

            const trunk = getTrunk(transformComponent);
            if (trunkHasLeaf(trunk)) {
               const tukmokMouthPosition = tukmokHeadHitbox.box.position.offset(28, tukmokHeadHitbox.box.angle);
               moveTrunk(trunk, tukmokMouthPosition);
            } else {
               moveTrunk(trunk, targetHitbox.box.position);

               const trunkHeadHitbox = getTrunkHeadHitbox(trunk);
               
               if (trunkHeadHitbox.parent !== targetHitbox) {
                  const trunkHeadToTree = trunkHeadHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
                  // First attach to the tree
                  if (getAbsAngleDiff(trunkHeadHitbox.box.angle, trunkHeadToTree) < 0.1 && trunkHeadHitbox.box.isColliding(targetHitbox.box)) {
                     attachHitbox(trunkHeadHitbox, targetHitbox, false);
                  }
               } else {

               }
            }
         } else {
            // Not close enough to grab, move closer

            aiHelperComponent.moveFunc(tukmok, targetHitbox.box.position, 200);
            aiHelperComponent.turnFunc(tukmok, targetHitbox.box.position, 1 * Math.PI, 0.6);
         }
         

         // if (entitiesAreColliding(tukmok, target) !== CollisionVars.NO_COLLISION) {
         //    const itemComponent = ItemComponentArray.getComponent(berryItemEntity);
         //    if (itemComponent.throwingEntity !== null) {
         //       const tamingComponent = TamingComponentArray.getComponent(cow);
         //       tamingComponent.foodEatenInTier++;
         //    }
         
         //    destroyEntity(berryItemEntity);
         
         //    const tickEvent: EntityTickEvent = {
         //       entityID: cow,
         //       type: EntityTickEventType.cowEat,
         //       data: 0
         //    };
         //    registerEntityTickEvent(cow, tickEvent);
         // }

         return;
      }
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(tukmok);
   if (wanderAI.targetPosition !== null) {
      aiHelperComponent.moveFunc(tukmok, wanderAI.targetPosition, wanderAI.acceleration);
      aiHelperComponent.turnFunc(tukmok, wanderAI.targetPosition, wanderAI.turnSpeed, wanderAI.turnDamping);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}