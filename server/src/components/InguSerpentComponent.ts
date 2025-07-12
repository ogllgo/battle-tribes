import { Biome } from "../../../shared/src/biomes";
import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { ItemType } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { StatusEffect } from "../../../shared/src/status-effects";
import { TileType } from "../../../shared/src/tiles";
import { customTickIntervalHasPassed, getAbsAngleDiff, Point, polarVec2, secondsToTicks } from "../../../shared/src/utils";
import { getDistanceFromPointToHitbox } from "../ai-shared";
import { hitboxIsCollidingWithEntity } from "../collision-detection";
import { addHitboxVelocity, applyAbsoluteKnockback, applyAcceleration, getHitboxTile, Hitbox } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { destroyEntity, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";
import { LocalBiome } from "../world-generation/terrain-generation-utils";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { addLocalInvulnerabilityHash, canDamageEntity, damageEntity, healEntity, HealthComponentArray } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent";
import { TamingComponentArray } from "./TamingComponent";
import { TransformComponentArray } from "./TransformComponent";

const LEAP_START_DISTANCE = 75;

const LEAP_DURATION_TICKS = secondsToTicks(0.32);
/** Cooldown after a leap ends that another leap cannot be initiated */
const LEAP_COOLDOWN_TICKS = secondsToTicks(0.9);
const LEAP_CHARGE_TICKS = secondsToTicks(0.25);

// Whenever the wraith leaps or eats a meat item, they go on cooldown before they can eat another meat item
const EAT_CHOMP_COOLDOWN_TICKS = secondsToTicks(0.45);
const LEAP_CHOMP_COOLDOWN_TICKS = secondsToTicks(0.65);

// @Cleanup: shouldn't be exported everywhere!
export const INGU_SERPENT_DIRECTION_CHANGE_COOLDOWN_TICKS = secondsToTicks(0.3);

const SLOW_ACCELERATION = 850;

export class InguSerpentComponent {
   public homeBiome: LocalBiome | null = null;
   
   public currentTurnDirectionIsClockwise = true;
   public directionChangeCooldownTicks = 0;
   public currentDirectionTicks = 0;
   
   public isLeaping = false;
   public leapElapsedTicks = 0;
   public leapCooldownTicks = LEAP_COOLDOWN_TICKS;
   public isChargingLeap = false;
   public leapChargeTicks = 0;

   public chompersCooldownTicks = EAT_CHOMP_COOLDOWN_TICKS;
}

export const InguSerpentComponentArray = new ComponentArray<InguSerpentComponent>(ServerComponentType.inguSerpent, true, getDataLength, addDataToPacket);
InguSerpentComponentArray.onJoin = onJoin;
InguSerpentComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};
InguSerpentComponentArray.onHitboxCollision = onHitboxCollision;

function onJoin(serpent: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(serpent);
   const hitbox = transformComponent.children[0] as Hitbox;
   const tile = getHitboxTile(hitbox);
   
   const layer = getEntityLayer(serpent);
   const localBiome = layer.getTileLocalBiome(tile);
   
   const inguSerpentComponent = InguSerpentComponentArray.getComponent(serpent);
   inguSerpentComponent.homeBiome = localBiome;
}

const isTarget = (entity: Entity): boolean => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   // @HACK @TEMPORARY cuz im doing the hack where i set snobe collision mask to 0 when they are dug in
   if (getEntityType(entity) === EntityType.snobe) {
      if (hitbox.collisionMask === 0) {
         return false;
      }
   }

   // Once prey has moved outside of the tundra then don't pursue any longer
   const tile = getHitboxTile(hitbox);
   const layer = getEntityLayer(entity);
   if (layer.getTileBiome(tile) !== Biome.tundra) {
      return false;
   }
   
   const entityType = getEntityType(entity);
   // @HACK @INCOMPLETE
   return entityType === EntityType.player || entityType === EntityType.snobe;
}

const getTarget = (wraith: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(wraith);
   const hitbox = transformComponent.children[0] as Hitbox;
   
   let target: Entity | null = null;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!isTarget(entity)) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const targetHitbox = entityTransformComponent.children[0] as Hitbox;
      const dist = hitbox.box.position.calculateDistanceBetween(targetHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

function onTick(serpent: Entity): void {
   const inguSerpentComponent = InguSerpentComponentArray.getComponent(serpent);
   if (inguSerpentComponent.directionChangeCooldownTicks > 0) {
      inguSerpentComponent.directionChangeCooldownTicks--;
   }
   if (inguSerpentComponent.leapCooldownTicks > 0) {
      inguSerpentComponent.leapCooldownTicks--;
   }
   if (inguSerpentComponent.chompersCooldownTicks > 0) {
      inguSerpentComponent.chompersCooldownTicks--;
   }
   inguSerpentComponent.currentDirectionTicks++;
   
   const transformComponent = TransformComponentArray.getComponent(serpent);
   const aiHelperComponent = AIHelperComponentArray.getComponent(serpent);

   const headHitbox = transformComponent.children[0] as Hitbox;

   // Eat snobe meat
   // @Copynpaste from yeti component and snobe component!
   {
      let minDist = Number.MAX_SAFE_INTEGER;
      let closestFoodItem: Entity | null = null;
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (getEntityType(entity) !== EntityType.itemEntity) {
            continue;
         }

         const itemComponent = ItemComponentArray.getComponent(entity);
         if (itemComponent.itemType === ItemType.rawSnobeMeat) {
            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = entityTransformComponent.children[0] as Hitbox;
            
            const distance = headHitbox.box.position.calculateDistanceBetween(entityHitbox.box.position);
            if (distance < minDist) {
               minDist = distance;
               closestFoodItem = entity;
            }
         }
      }
      if (closestFoodItem !== null) {
         // If waiting until the wraith can chomp again, just stay still and do nothing
         if (inguSerpentComponent.chompersCooldownTicks > 0) {
            return;
         }
         
         const foodTransformComponent = TransformComponentArray.getComponent(closestFoodItem);
         const foodHitbox = foodTransformComponent.children[0] as Hitbox;
         
         aiHelperComponent.turnFunc(serpent, foodHitbox.box.position, 3.5 * Math.PI, 1.8);
         aiHelperComponent.moveFunc(serpent, foodHitbox.box.position, SLOW_ACCELERATION);

         if (hitboxIsCollidingWithEntity(headHitbox, closestFoodItem)) {
            healEntity(serpent, 3, serpent);
            destroyEntity(closestFoodItem);

            inguSerpentComponent.chompersCooldownTicks = EAT_CHOMP_COOLDOWN_TICKS;
            
            const itemComponent = ItemComponentArray.getComponent(closestFoodItem);
            if (itemComponent.throwingEntity !== null) {
               const tamingComponent = TamingComponentArray.getComponent(serpent);
               tamingComponent.foodEatenInTier++;
            }

            // @Hack
            const tickEvent: EntityTickEvent = {
               entityID: serpent,
               type: EntityTickEventType.cowEat,
               data: 0
            };
            registerEntityTickEvent(serpent, tickEvent);
         }
         return;
      }
   }

   const target = getTarget(serpent, aiHelperComponent);
   if (target !== null) {
      const targetTransformComponent = TransformComponentArray.getComponent(target);
      const targetHitbox = targetTransformComponent.children[0] as Hitbox;

      const headToTarget = headHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
      const distFromTarget = getDistanceFromPointToHitbox(headHitbox.box.position, targetHitbox);

      if (!inguSerpentComponent.isLeaping && inguSerpentComponent.leapCooldownTicks === 0 && distFromTarget <= LEAP_START_DISTANCE && getAbsAngleDiff(headHitbox.box.angle, headToTarget) < 0.36) {
         inguSerpentComponent.isChargingLeap = true;
      }

      if (inguSerpentComponent.isChargingLeap && inguSerpentComponent.leapChargeTicks < LEAP_CHARGE_TICKS) {
         inguSerpentComponent.leapChargeTicks++;
      }

      if (!inguSerpentComponent.isLeaping && inguSerpentComponent.leapChargeTicks >= LEAP_CHARGE_TICKS) {
         // Stop charging leap and leap!

         inguSerpentComponent.isChargingLeap = false;
         inguSerpentComponent.leapChargeTicks = 0;
         inguSerpentComponent.isLeaping = true;
         inguSerpentComponent.leapElapsedTicks = 0;

         inguSerpentComponent.chompersCooldownTicks = LEAP_CHOMP_COOLDOWN_TICKS;

         const tickEvent: EntityTickEvent = {
            entityID: serpent,
            type: EntityTickEventType.wraithAngryLeap,
            data: 0
         };
         registerEntityTickEvent(serpent, tickEvent);

         // Initial jump
         const bodyHitbox = transformComponent.children[0] as Hitbox;
         const bodyToTargetDir = bodyHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
         addHitboxVelocity(bodyHitbox, polarVec2(300, bodyToTargetDir));

         const headToTargetDir = headHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
         addHitboxVelocity(headHitbox, polarVec2(300, headToTargetDir));
      }

      if (inguSerpentComponent.isChargingLeap) {
         aiHelperComponent.turnFunc(serpent, targetHitbox.box.position, 3.5 * Math.PI, 1.8);
      } else if (inguSerpentComponent.isLeaping) {
         aiHelperComponent.turnFunc(serpent, targetHitbox.box.position, 3.5 * Math.PI, 1.8);
         
         inguSerpentComponent.leapElapsedTicks++;
         if (inguSerpentComponent.leapElapsedTicks >= LEAP_DURATION_TICKS) {
            inguSerpentComponent.isLeaping = false;
            inguSerpentComponent.leapCooldownTicks = LEAP_COOLDOWN_TICKS;
         }
      } else {
         if (distFromTarget > LEAP_START_DISTANCE - 15) {
            aiHelperComponent.moveFunc(serpent, targetHitbox.box.position, 1550);
         }
         aiHelperComponent.turnFunc(serpent, targetHitbox.box.position, 3.5 * Math.PI, 1.8);

         if (customTickIntervalHasPassed(getEntityAgeTicks(serpent), 0.5)) {
            const tickEvent: EntityTickEvent = {
               entityID: serpent,
               type: EntityTickEventType.wraithPant,
               data: 0
            };
            registerEntityTickEvent(serpent, tickEvent);
         }
      }

      return;
   }

   // If not in its home biome, move back to home
   if (inguSerpentComponent.homeBiome !== null) {
      const bodyHitbox = transformComponent.children[0] as Hitbox;

      const layer = getEntityLayer(serpent);
      const tile = getHitboxTile(bodyHitbox);
      if (layer.getTileType(tile) !== TileType.permafrost) {
         const homePos = new Point(inguSerpentComponent.homeBiome.centerX, inguSerpentComponent.homeBiome.centerY);
         // @HACK this should use pathfinding to get back
         aiHelperComponent.moveFunc(serpent, homePos, SLOW_ACCELERATION);
         aiHelperComponent.turnFunc(serpent, homePos, 3.5 * Math.PI, 1.8);
         return;
      }
   }
   
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(serpent);
   if (wanderAI.targetPosition !== null) {
      aiHelperComponent.moveFunc(serpent, wanderAI.targetPosition, wanderAI.acceleration);
      aiHelperComponent.turnFunc(serpent, wanderAI.targetPosition, wanderAI.turnSpeed, wanderAI.turnDamping);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(serpent: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   if (!affectedHitbox.flags.includes(HitboxFlag.INGU_SERPENT_HEAD)) {
      return;
   }
   
   // const wraithComponent = WraithComponentArray.getComponent(wraith);
   // if (!wraithComponent.isLeaping) {
   //    return;
   // }
   
   if (!isTarget(collidingEntity)) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const localInvulnerabilityHash = "inguSerpent" + serpent;
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, localInvulnerabilityHash)) {
      return;
   }

   const hitDir = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);

   damageEntity(collidingEntity, collidingHitbox, serpent, 3, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingEntity, collidingHitbox, polarVec2(200, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, localInvulnerabilityHash, 0.3);

   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.freezing, 3 * Settings.TPS);
   }
}