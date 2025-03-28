import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType } from "battletribes-shared/entities";
import { assert, randInt, UtilVars } from "battletribes-shared/utils";
import { moveEntityToPosition } from "../ai-shared";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { getEscapeTarget, runEscapeAI } from "./EscapeAIComponent";
import { FollowAIComponentArray, updateFollowAIComponent, entityWantsToFollow, followAISetFollowTarget } from "./FollowAIComponent";
import { getTransformComponentFirstHitbox, TransformComponentArray } from "./TransformComponent";
import { KrumblidVars } from "../entities/mobs/krumblid";
import { destroyEntity, entityExists, getEntityLayer, getEntityType } from "../world";
import { getHitboxTile, Hitbox } from "../hitboxes";
import { HealthComponentArray } from "./HealthComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { Biome } from "../../../shared/src/biomes";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { addHungerEnergy, getEntityFullness } from "./HungerComponent";
import { EnergyStoreComponentArray } from "./EnergyStoreComponent";

const enum Vars {
   TURN_SPEED = UtilVars.PI * 2
}

export class KrumblidComponent {}

export const KrumblidComponentArray = new ComponentArray<KrumblidComponent>(ServerComponentType.krumblid, true, getDataLength, addDataToPacket);
KrumblidComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const getTargetPricklyPear = (krumblid: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.children[0] as Hitbox;
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (getEntityType(entity) !== EntityType.pricklyPear) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.children[0] as Hitbox;

      const dist = hitbox.box.position.calculateDistanceBetween(entityHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

const entityIsFollowable = (entity: Entity): boolean => {
   // Try to hide in cacti!
   if (getEntityType(entity) === EntityType.cactus) {
      return true;
   }
   
   if (!HealthComponentArray.hasComponent(entity)) {
      return false;
   }

   if (getEntityType(entity) === EntityType.krumblid) {
      return false;
   }

   if (!AIHelperComponentArray.hasComponent(entity)) {
      return false;
   }
    
   if (!PhysicsComponentArray.hasComponent(entity)) {
      return false;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if (physicsComponent.isImmovable) {
      // So it isn't interested in trees n shit
      // @Incomplete: what about mobs which don't move? those should be interesting
      return false;
   }
   
   // Not interested in entities outside of the desert
   // @Incomplete: should be interested in entities oustide of the desert, just won't walk out of the desert!
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = getTransformComponentFirstHitbox(transformComponent);
   assert(hitbox !== null);
   const entityTile = getHitboxTile(hitbox);
   const layer = getEntityLayer(entity);
   if (layer.getTileBiome(entityTile) !== Biome.desert) {
      return false;
   }
   
   return true;
}

function onTick(krumblid: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(krumblid);
   
   const escapeTarget = getEscapeTarget(krumblid);
   if (escapeTarget !== null) {
      runEscapeAI(krumblid, escapeTarget);
      return;
   }

   // Eat prickly pears
   const fullness = getEntityFullness(krumblid);
   if (fullness < 0.5) {
      const targetPricklyPear = getTargetPricklyPear(krumblid, aiHelperComponent);
      if (targetPricklyPear !== null) {
         const targetTransformComponent = TransformComponentArray.getComponent(targetPricklyPear);
         // @Hack
         const targetHitbox = targetTransformComponent.children[0] as Hitbox;
         
         moveEntityToPosition(krumblid, targetHitbox.box.position.x, targetHitbox.box.position.y, 250, Vars.TURN_SPEED);
   
         if (entitiesAreColliding(krumblid, targetPricklyPear) !== CollisionVars.NO_COLLISION) {
            const energyStoreComponent = EnergyStoreComponentArray.getComponent(targetPricklyPear);
            addHungerEnergy(krumblid, energyStoreComponent.energyAmount);
            destroyEntity(targetPricklyPear);
         }
         return;
      }
   }
   
   // Follow AI: Make the krumblid like to hide in cacti
   const followAIComponent = FollowAIComponentArray.getComponent(krumblid);
   updateFollowAIComponent(krumblid, aiHelperComponent.visibleEntities, 5);

   const followedEntity = followAIComponent.followTargetID;
   if (entityExists(followedEntity)) {
      const followedEntityTransformComponent = TransformComponentArray.getComponent(followedEntity);
      // @Hack
      const followedEntityHitbox = followedEntityTransformComponent.children[0] as Hitbox;
      
      // Continue following the entity
      moveEntityToPosition(krumblid, followedEntityHitbox.box.position.x, followedEntityHitbox.box.position.y, 250, Vars.TURN_SPEED);
      return;
   } else if (entityWantsToFollow(followAIComponent)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entityIsFollowable(entity)) {
            // Follow the entity
            followAISetFollowTarget(krumblid, entity, randInt(KrumblidVars.MIN_FOLLOW_COOLDOWN, KrumblidVars.MAX_FOLLOW_COOLDOWN), true);
            // @Incomplete: movement isn't accounted for!
            return;
         }
      }
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(krumblid);
   if (wanderAI.targetPositionX !== -1) {
      moveEntityToPosition(krumblid, wanderAI.targetPositionX, wanderAI.targetPositionY, 250, 2 * Math.PI);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}