import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType } from "battletribes-shared/entities";
import { randInt, UtilVars } from "battletribes-shared/utils";
import { moveEntityToPosition, stopEntity } from "../ai-shared";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { getEscapeTarget, runEscapeAI } from "./EscapeAIComponent";
import { FollowAIComponentArray, updateFollowAIComponent, entityWantsToFollow, startFollowingEntity } from "./FollowAIComponent";
import { TransformComponentArray } from "./TransformComponent";
import { KrumblidVars } from "../entities/mobs/krumblid";
import { entityExists, getEntityType } from "../world";
import { ItemType } from "../../../shared/src/items/items";
import { createItemsOverEntity } from "../entities/item-entity";
import { PhysicsComponentArray } from "./PhysicsComponent";

const enum Vars {
   TURN_SPEED = UtilVars.PI * 2
}

export class KrumblidComponent {}

export const KrumblidComponentArray = new ComponentArray<KrumblidComponent>(ServerComponentType.krumblid, true, getDataLength, addDataToPacket);
KrumblidComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
KrumblidComponentArray.preRemove = preRemove;

function onTick(krumblid: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(krumblid);
   
   const escapeTarget = getEscapeTarget(krumblid);
   if (escapeTarget !== null) {
      runEscapeAI(krumblid, escapeTarget);
      return;
   }
   
   // Follow AI: Make the krumblid like to hide in cacti
   const followAIComponent = FollowAIComponentArray.getComponent(krumblid);
   updateFollowAIComponent(krumblid, aiHelperComponent.visibleEntities, 5);

   const followedEntity = followAIComponent.followTargetID;
   if (entityExists(followedEntity)) {
      const followedEntityTransformComponent = TransformComponentArray.getComponent(followedEntity);
      // Continue following the entity
      moveEntityToPosition(krumblid, followedEntityTransformComponent.position.x, followedEntityTransformComponent.position.y, 200, Vars.TURN_SPEED);
      return;
   } else if (entityWantsToFollow(followAIComponent)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (getEntityType(entity) === EntityType.player) {
            // Follow the entity
            startFollowingEntity(krumblid, entity, 200, Vars.TURN_SPEED, randInt(KrumblidVars.MIN_FOLLOW_COOLDOWN, KrumblidVars.MAX_FOLLOW_COOLDOWN), true);
            return;
         }
      }
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(krumblid);
   if (wanderAI.targetPositionX !== -1) {
      moveEntityToPosition(krumblid, wanderAI.targetPositionX, wanderAI.targetPositionY, 200, 2 * Math.PI);
   } else {
      const physicsComponent = PhysicsComponentArray.getComponent(krumblid);
      stopEntity(physicsComponent);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

export function preRemove(krumblid: Entity): void {
   createItemsOverEntity(krumblid, ItemType.leather, randInt(2, 3));
}