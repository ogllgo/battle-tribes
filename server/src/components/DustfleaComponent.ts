import { Biome } from "../../../shared/src/biomes";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { Settings } from "../../../shared/src/settings";
import { assert, distance, Point, randInt } from "../../../shared/src/utils";
import { runHibernateAI } from "../ai/DustfleaHibernateAI";
import { getEscapeTarget, runEscapeAI } from "../ai/EscapeAI";
import { updateFollowAIComponent, entityWantsToFollow, followAISetFollowTarget } from "../ai/FollowAI";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { getHitboxTile, Hitbox, setHitboxAngularVelocity, stopHitboxTurning } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { destroyEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType, getGameTicks, ticksToGameHours } from "../world";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, hitEntity } from "./HealthComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { attachEntity, getTransformComponentFirstHitbox, removeAttachedEntity, TransformComponentArray } from "./TransformComponent";

const MIN_OBSTACLE_SIT_MODE_TICKS = 25 * Settings.TPS;
const MAX_OBSTACLE_SIT_MODE_TICKS = 40 * Settings.TPS;

export class DustfleaComponent {
   public obstacleSitModeRemainingTicks = randInt(MIN_OBSTACLE_SIT_MODE_TICKS, MAX_OBSTACLE_SIT_MODE_TICKS);
   public latchTicks = 0;
}

export const DustfleaComponentArray = new ComponentArray<DustfleaComponent>(ServerComponentType.dustflea, true, getDataLength, addDataToPacket);
DustfleaComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
DustfleaComponentArray.onWallCollision = onWallCollision;

const entityIsFollowable = (entity: Entity): boolean => {
   if (!HealthComponentArray.hasComponent(entity)) {
      return false;
   }

   // don't follow the same entity type
   if (getEntityType(entity) === EntityType.dustflea) {
      return false;
   }

   // Don't follow non-sentient entities
   if (!AIHelperComponentArray.hasComponent(entity)&& getEntityType(entity) !== EntityType.player) {
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

const getSitTarget = (dustflea: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.children[0] as Hitbox;
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      const entityType = getEntityType(entity);
      if (entityType !== EntityType.desertBushLively && entityType !== EntityType.desertBushSandy && entityType !== EntityType.desertShrub && entityType !== EntityType.sandstoneRock) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.children[0] as Hitbox;

      const dist = dustfleaHitbox.box.position.calculateDistanceBetween(entityHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

const entityIsSuckTarget = (entity: Entity): boolean => {
   const entityType = getEntityType(entity);
   return entityType === EntityType.player;
   // return entityType === EntityType.player || entityType === EntityType.krumblid || entityType === EntityType.zombie || entityType === EntityType.okren;
   // return entityType === EntityType.krumblid || entityType === EntityType.zombie || entityType === EntityType.okren;
}

const getSuckTarget = (dustflea: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.children[0] as Hitbox;
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!entityIsSuckTarget(entity)) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.children[0] as Hitbox;

      const dist = dustfleaHitbox.box.position.calculateDistanceBetween(entityHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

function onTick(dustflea: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(dustflea);

   const escapeAI = aiHelperComponent.getEscapeAI();
   const escapeTarget = getEscapeTarget(dustflea, escapeAI);
   if (escapeTarget !== null) {
      runEscapeAI(dustflea, escapeTarget);
      return;
   }

   const ageTicks = getEntityAgeTicks(dustflea);
   const ageHours = ticksToGameHours(ageTicks);
   if (ageHours >= 2) {
      const hibernateAI = aiHelperComponent.getDustfleaHibernateAI();
      runHibernateAI(dustflea, aiHelperComponent, hibernateAI);
      return;
   }

   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.children[0] as Hitbox;

   // Find some targets to suckle
   const suckTarget = getSuckTarget(dustflea, aiHelperComponent);
   if (suckTarget !== null && dustfleaTransformComponent.rootEntity !== dustflea && entityExists(dustfleaTransformComponent.rootEntity) && !entityIsSuckTarget(dustfleaTransformComponent.rootEntity)) {
      removeAttachedEntity(dustfleaTransformComponent.rootEntity, dustflea);
   }
   if (dustfleaTransformComponent.rootEntity === dustflea) {
      if (suckTarget !== null) {
         const targetTransformComponent = TransformComponentArray.getComponent(suckTarget);
         const targetHitbox = targetTransformComponent.children[0] as Hitbox;
         aiHelperComponent.move(dustflea, 250, 2 * Math.PI, targetHitbox.box.position.x, targetHitbox.box.position.y);
         if (entitiesAreColliding(dustflea, suckTarget) !== CollisionVars.NO_COLLISION && dustfleaHitbox.velocity.calculateDistanceBetween(targetHitbox.velocity) < 125) {
            // @Hack: not doing this causes the parents to jitter..... for some reason???
            dustfleaHitbox.velocity.x = 0;
            dustfleaHitbox.velocity.y = 0;
            
            attachEntity(dustflea, suckTarget, targetHitbox, false);

            const tickEvent: EntityTickEvent = {
               type: EntityTickEventType.dustfleaLatch,
               data: 0,
               entityID: dustflea
            };
            registerEntityTickEvent(dustflea, tickEvent);

            const dustfleaComponent = DustfleaComponentArray.getComponent(dustflea);
            dustfleaComponent.latchTicks = getGameTicks() + randInt(0, Settings.TPS - 1);
         }
         return;
      }
   } else if (entityExists(dustfleaTransformComponent.rootEntity) && HealthComponentArray.hasComponent(dustfleaTransformComponent.rootEntity) && entityIsSuckTarget(dustfleaTransformComponent.rootEntity)) {
      // wriggle around
      const ageTicks = getEntityAgeTicks(dustflea);
      setHitboxAngularVelocity(dustfleaHitbox, 8 * Math.sin((ageTicks / Settings.TPS) * 40));
      
      const dustfleaComponent = DustfleaComponentArray.getComponent(dustflea);
      const ticksSinceLatch = ageTicks - dustfleaComponent.latchTicks;
      if (ticksSinceLatch % (Settings.TPS * 2) === 0) {
         hitEntity(dustfleaTransformComponent.rootEntity, dustflea, 1, 0, AttackEffectiveness.effective, dustfleaHitbox.box.position.copy(), 0)
      }
      return;
   }

   const dustfleaComponent = DustfleaComponentArray.getComponent(dustflea);
   if (dustfleaComponent.obstacleSitModeRemainingTicks > 0) {
      // dustfleaComponent.obstacleSitModeRemainingTicks--;

      // obstacle site mode

      const transformComponent = TransformComponentArray.getComponent(dustflea);
      if (transformComponent.rootEntity === dustflea) {
         const sitTarget = getSitTarget(dustflea, aiHelperComponent);
         if (sitTarget !== null) {
            const targetTransformComponent = TransformComponentArray.getComponent(sitTarget);
            const targetHitbox = targetTransformComponent.children[0] as Hitbox;
            aiHelperComponent.move(dustflea, 250, 2 * Math.PI, targetHitbox.box.position.x, targetHitbox.box.position.y);
            if (entitiesAreColliding(dustflea, sitTarget) !== CollisionVars.NO_COLLISION) {
               // @Hack: not doing this causes the parents to jitter..... for some reason???
               dustfleaHitbox.velocity.x = 0;
               dustfleaHitbox.velocity.y = 0;
               
               attachEntity(dustflea, sitTarget, targetHitbox, false);
            }
            return;
         }
      } else {
         // is sitting
         stopHitboxTurning(dustfleaHitbox);
         return;
      }
   } else {
      if (Math.random() < 0.15 / Settings.TPS) {
         dustfleaComponent.obstacleSitModeRemainingTicks = randInt(MIN_OBSTACLE_SIT_MODE_TICKS, MAX_OBSTACLE_SIT_MODE_TICKS);
      }
   }

   if (dustfleaTransformComponent.parentEntity !== dustflea) {
      // . what
      if (TransformComponentArray.hasComponent(dustfleaTransformComponent.parentEntity)) {
         removeAttachedEntity(dustfleaTransformComponent.parentEntity, dustflea);
      }
   }

   // Follow AI
   const followAI = aiHelperComponent.getFollowAI();
   updateFollowAIComponent(followAI, aiHelperComponent.visibleEntities, 5);

   const followedEntity = followAI.followTargetID;
   if (entityExists(followedEntity)) {
      const followedEntityTransformComponent = TransformComponentArray.getComponent(followedEntity);
      // @Hack
      const followedEntityHitbox = followedEntityTransformComponent.children[0] as Hitbox;
      
      // Continue following the entity
      aiHelperComponent.move(dustflea, 250, 2 * Math.PI, followedEntityHitbox.box.position.x, followedEntityHitbox.box.position.y);
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
   
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(dustflea);
   if (wanderAI.targetPositionX !== -1) {
      aiHelperComponent.move(dustflea, 250, 2 * Math.PI, wanderAI.targetPositionX, wanderAI.targetPositionY);
   } else {
      stopHitboxTurning(dustfleaHitbox);
   }
}

function onWallCollision(dustflea: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(dustflea);

   // Die when crushed against a wall
   if (transformComponent.rootEntity !== dustflea) {
      const hitbox = getTransformComponentFirstHitbox(transformComponent);
      hitEntity(dustflea, null, 999, 0, AttackEffectiveness.effective, hitbox!.box.position.copy(), 0);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}