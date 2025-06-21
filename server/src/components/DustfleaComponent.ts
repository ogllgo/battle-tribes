import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { Settings } from "../../../shared/src/settings";
import { assert, randInt } from "../../../shared/src/utils";
import { runHibernateAI } from "../ai/DustfleaHibernateAI";
import { runEscapeAI } from "../ai/EscapeAI";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { addHitboxAngularAcceleration, getHitboxVelocity, Hitbox } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { entityExists, getEntityAgeTicks, getEntityType, getGameTicks, ticksToGameHours } from "../world";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { addHungerEnergy, getEntityFullness } from "./EnergyStomachComponent";
import { damageEntity } from "./HealthComponent";
import { attachEntity, getTransformComponentFirstHitbox, removeAttachedEntity, TransformComponentArray } from "./TransformComponent";
import { TribeMemberComponentArray } from "./TribeMemberComponent";

const MIN_OBSTACLE_SIT_MODE_TICKS = 8 * Settings.TPS;
const MAX_OBSTACLE_SIT_MODE_TICKS = 16 * Settings.TPS;

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
   return TribeMemberComponentArray.hasComponent(entity) || entityType === EntityType.krumblid || entityType === EntityType.zombie || entityType === EntityType.okren;
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
   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);

   // If the dustflea is attached to something, don't escape at all. (To prevent it trying to hop around in escape, while on an okren, causing the okren to hop around)
   if (dustfleaTransformComponent.rootEntity === dustflea) {
      const escapeAI = aiHelperComponent.getEscapeAI();
      if (runEscapeAI(dustflea, aiHelperComponent, escapeAI)) {
         return;
      }
   }

   const ageTicks = getEntityAgeTicks(dustflea);
   const ageHours = ticksToGameHours(ageTicks);
   if (ageHours >= 8) {
      const hibernateAI = aiHelperComponent.getDustfleaHibernateAI();
      runHibernateAI(dustflea, aiHelperComponent, hibernateAI);
      return;
   }

   const dustfleaHitbox = dustfleaTransformComponent.children[0] as Hitbox;

   // If hungry, look for a target to suck
   // Find some targets to suckle
   if (getEntityFullness(dustflea) < 0.5) {
      const suckTarget = getSuckTarget(dustflea, aiHelperComponent);
      if (suckTarget !== null) {
         if (dustfleaTransformComponent.rootEntity !== dustflea && entityExists(dustfleaTransformComponent.rootEntity) && !entityIsSuckTarget(dustfleaTransformComponent.rootEntity)) {
            // If the dustflea is attached to something which isn't the suck target (like a rock or something), unattach
            removeAttachedEntity(dustfleaTransformComponent.rootEntity, dustflea);
         }
         if (dustfleaTransformComponent.rootEntity === dustflea) {
            const targetTransformComponent = TransformComponentArray.getComponent(suckTarget);
            const targetHitbox = targetTransformComponent.children[0] as Hitbox;
            aiHelperComponent.move(dustflea, 250, 16 * Math.PI, targetHitbox.box.position.x, targetHitbox.box.position.y);
            if (entitiesAreColliding(dustflea, suckTarget) !== CollisionVars.NO_COLLISION && getHitboxVelocity(dustfleaHitbox).calculateDistanceBetween(getHitboxVelocity(targetHitbox)) < 125) {
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
      }
   }

   // If attached, suck
   if (dustfleaTransformComponent.rootEntity !== dustflea && entityExists(dustfleaTransformComponent.rootEntity) && entityIsSuckTarget(dustfleaTransformComponent.rootEntity)) {
      // wriggle around
      const ageTicks = getEntityAgeTicks(dustflea);
      addHitboxAngularAcceleration(dustfleaHitbox, 8 * Math.sin((ageTicks / Settings.TPS) * 40));
      
      // Suck
      const dustfleaComponent = DustfleaComponentArray.getComponent(dustflea);
      const ticksSinceLatch = ageTicks - dustfleaComponent.latchTicks;
      if (ticksSinceLatch % (Settings.TPS * 2) === 0) {
         damageEntity(dustfleaTransformComponent.rootEntity, dustfleaHitbox, dustflea, 1, 0, AttackEffectiveness.effective, dustfleaHitbox.box.position.copy(), 0)
         addHungerEnergy(dustflea, 10);
      }
      
      // Unlatch when full
      if (getEntityFullness(dustflea) > 0.8) {
         removeAttachedEntity(dustfleaTransformComponent.rootEntity, dustflea);
      }

      return;
   }
   

   const dustfleaComponent = DustfleaComponentArray.getComponent(dustflea);
   if (dustfleaComponent.obstacleSitModeRemainingTicks > 0) {
      dustfleaComponent.obstacleSitModeRemainingTicks--;

      // obstacle site mode

      const transformComponent = TransformComponentArray.getComponent(dustflea);
      if (transformComponent.rootEntity === dustflea) {
         const sitTarget = getSitTarget(dustflea, aiHelperComponent);
         if (sitTarget !== null) {
            const targetTransformComponent = TransformComponentArray.getComponent(sitTarget);
            const targetHitbox = targetTransformComponent.children[0] as Hitbox;
            aiHelperComponent.move(dustflea, 250, 2 * Math.PI, targetHitbox.box.position.x, targetHitbox.box.position.y);
            if (entitiesAreColliding(dustflea, sitTarget) !== CollisionVars.NO_COLLISION) {
               attachEntity(dustflea, sitTarget, targetHitbox, false);
            }
            return;
         }
      } else {
         // is sitting
         return;
      }
   } else {
      if (Math.random() < 0.15 / Settings.TPS) {
         dustfleaComponent.obstacleSitModeRemainingTicks = randInt(MIN_OBSTACLE_SIT_MODE_TICKS, MAX_OBSTACLE_SIT_MODE_TICKS);
      }
   }

   if (dustfleaTransformComponent.parentEntity !== dustflea) {
      // . what @Incomplete
      if (TransformComponentArray.hasComponent(dustfleaTransformComponent.parentEntity)) {
         removeAttachedEntity(dustfleaTransformComponent.parentEntity, dustflea);
      }
   }
   
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(dustflea);
   if (wanderAI.targetPositionX !== -1) {
      aiHelperComponent.move(dustflea, 250, 2 * Math.PI, wanderAI.targetPositionX, wanderAI.targetPositionY);
   }
}

function onWallCollision(dustflea: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(dustflea);

   // Die when crushed against a wall
   if (transformComponent.rootEntity !== dustflea) {
      const hitbox = getTransformComponentFirstHitbox(transformComponent);
      assert(hitbox !== null);
      damageEntity(dustflea, hitbox, null, 999, 0, AttackEffectiveness.effective, hitbox!.box.position.copy(), 0);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}