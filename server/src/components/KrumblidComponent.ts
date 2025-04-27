import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType } from "battletribes-shared/entities";
import { assert, UtilVars } from "battletribes-shared/utils";
import { moveEntityToPosition, runHerdAI } from "../ai-shared";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { runEscapeAI } from "../ai/EscapeAI";
import { updateFollowAIComponent, entityWantsToFollow, followAISetFollowTarget } from "../ai/FollowAI";
import { getTransformComponentFirstHitbox, TransformComponentArray } from "./TransformComponent";
import { destroyEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType, ticksToGameHours } from "../world";
import { applyAccelerationFromGround, getHitboxTile, Hitbox, turnHitboxToAngle } from "../hitboxes";
import { HealthComponentArray } from "./HealthComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { Biome } from "../../../shared/src/biomes";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { addHungerEnergy, getEntityFullness } from "./HungerComponent";
import { EnergyStoreComponentArray } from "./EnergyStoreComponent";
import { runSandBallingAI, shouldRunSandBallingAI, updateSandBallingAI } from "../ai/SandBallingAI";
import { runVegetationConsumeAI, shouldRunVegetationConsumeAI, updateVegetationConsumeAI } from "../ai/VegetationConsumeAI";
import { runKrumblidCombatAI, shouldRunKrumblidCombatAI, updateKrumblidCombatAI } from "../ai/KrumblidCombatAI";
import { runKrumblidHibernateAI } from "../ai/KrumblidHibernateAI";
import { Settings } from "../../../shared/src/settings";

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

   // By default, move the krumblids' mandibles back to their resting position
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   for (let i = 0; i < 2; i++) {
      const mandibleHitbox = transformComponent.children[i + 1] as Hitbox;
      turnHitboxToAngle(mandibleHitbox, 0.1 * Math.PI, 3 * Math.PI, 0.5, true);
   }
   
   const escapeAI = aiHelperComponent.getEscapeAI();
   if (runEscapeAI(krumblid, aiHelperComponent, escapeAI)) {
      return;
   }
   
   const ageTicks = getEntityAgeTicks(krumblid);
   const ageHours = ticksToGameHours(ageTicks);
   if (ageHours >= 12) {
      const hibernateAI = aiHelperComponent.getKrumblidHibernateAI();
      runKrumblidHibernateAI(krumblid, aiHelperComponent, hibernateAI);
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
         
         moveEntityToPosition(krumblid, targetHitbox.box.position.x, targetHitbox.box.position.y, 250, Vars.TURN_SPEED, 1);
   
         if (entitiesAreColliding(krumblid, targetPricklyPear) !== CollisionVars.NO_COLLISION) {
            const energyStoreComponent = EnergyStoreComponentArray.getComponent(targetPricklyPear);
            addHungerEnergy(krumblid, energyStoreComponent.energyAmount);
            destroyEntity(targetPricklyPear);
         }
         return;
      }
   }

   if (getEntityFullness(krumblid) < 0.5) {
      const krumblidCombatAI = aiHelperComponent.getKrumblidCombatAI();
      updateKrumblidCombatAI(krumblid, aiHelperComponent, krumblidCombatAI);
      if (shouldRunKrumblidCombatAI(krumblidCombatAI)) {
         runKrumblidCombatAI(krumblid, aiHelperComponent, krumblidCombatAI);
         return;
      }
   }
   
   // Follow AI: Make the krumblid like to hide in cacti
   const followAI = aiHelperComponent.getFollowAI();
   updateFollowAIComponent(followAI, aiHelperComponent.visibleEntities, 5);

   const followedEntity = followAI.followTargetID;
   if (entityExists(followedEntity)) {
      const followedEntityTransformComponent = TransformComponentArray.getComponent(followedEntity);
      // @Hack
      const followedEntityHitbox = followedEntityTransformComponent.children[0] as Hitbox;
      
      // Continue following the entity
      moveEntityToPosition(krumblid, followedEntityHitbox.box.position.x, followedEntityHitbox.box.position.y, 250, Vars.TURN_SPEED, 1);
      return;
   } else if (entityWantsToFollow(followAI)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entityIsFollowable(entity)) {
            // Follow the entity
            followAISetFollowTarget(followAI, entity, true);
            // @Incomplete: movement isn't accounted for!
            return;
         }
      }
   }

   // Vegetation consume AI
   if (getEntityFullness(krumblid) < 0.5) {
      const vegetationConsumeAI = aiHelperComponent.getVegetationConsumeAI();
      updateVegetationConsumeAI(krumblid, aiHelperComponent, vegetationConsumeAI);
      if (shouldRunVegetationConsumeAI(vegetationConsumeAI)) {
         runVegetationConsumeAI(krumblid, aiHelperComponent, vegetationConsumeAI);
         return;
      }
   }

   // Sand balling AI
   // something they do for fun
   const sandBallingAI = aiHelperComponent.getSandBallingAI();
   updateSandBallingAI(sandBallingAI);
   if (shouldRunSandBallingAI(sandBallingAI)) {
      runSandBallingAI(krumblid, aiHelperComponent, sandBallingAI);
      return;
   }

   // Herd AI
   // @Incomplete: Steer the herd away from non-plains biomes
   let herdMembers = new Array<Entity>();
   for (const entity of aiHelperComponent.visibleEntities) {
      if (getEntityType(entity) === EntityType.krumblid) {
         herdMembers.push(entity);
      }
   }
   if (herdMembers.length >= 2 && herdMembers.length <= 6) {
      runHerdAI(krumblid, herdMembers, aiHelperComponent.visionRange, 2 * Math.PI, 50, 0.7, 0.5, 0.3);

      const hitbox = transformComponent.children[0] as Hitbox;
      
      // @Incomplete: use new move func
      const accelerationX = 200 * Math.sin(hitbox.box.angle);
      const accelerationY = 200 * Math.cos(hitbox.box.angle);
      applyAccelerationFromGround(krumblid, hitbox, accelerationX, accelerationY);
      return;
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(krumblid);
   if (wanderAI.targetPositionX !== -1) {
      moveEntityToPosition(krumblid, wanderAI.targetPositionX, wanderAI.targetPositionY, 250, 2 * Math.PI, 1);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}