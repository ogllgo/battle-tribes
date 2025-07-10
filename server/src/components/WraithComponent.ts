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
import { CollisionVars, entitiesAreColliding, hitboxIsCollidingWithEntity } from "../collision-detection";
import { addHitboxVelocity, applyAbsoluteKnockback, applyAcceleration, getHitboxTile, Hitbox } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { destroyEntity, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";
import { LocalBiome } from "../world-generation/terrain-generation-utils";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash, healEntity } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { applyStatusEffect, StatusEffectComponentArray } from "./StatusEffectComponent";
import { TamingComponentArray } from "./TamingComponent";
import { TransformComponentArray } from "./TransformComponent";

// const LEAP_START_DISTANCE = 100;
// const LEAP_DURATION_TICKS = secondsToTicks(0.32);
// /** Cooldown after a leap ends that another leap cannot be initiated */
// const LEAP_COOLDOWN_TICKS = secondsToTicks(0.9);
// const LEAP_CHARGE_TICKS = secondsToTicks(0.3);

// // Whenever the wraith leaps or eats a meat item, they go on cooldown before they can eat another meat item
// const EAT_CHOMP_COOLDOWN_TICKS = secondsToTicks(0.45);
// const LEAP_CHOMP_COOLDOWN_TICKS = secondsToTicks(0.65);

// export class WraithComponent {
//    public homeBiome: LocalBiome | null = null;
   
//    public isLeaping = false;
//    public leapElapsedTicks = 0;
//    public leapCooldownTicks = LEAP_COOLDOWN_TICKS;
//    public isChargingLeap = false;
//    public leapChargeTicks = 0;

//    public chompersCooldownTicks = EAT_CHOMP_COOLDOWN_TICKS;
// }

// export const WraithComponentArray = new ComponentArray<WraithComponent>(ServerComponentType.wraith, true, getDataLength, addDataToPacket);
// WraithComponentArray.onJoin = onJoin;
// WraithComponentArray.onTick = {
//    func: onTick,
//    tickInterval: 1
// };
// WraithComponentArray.onHitboxCollision = onHitboxCollision;

// function onJoin(wraith: Entity): void {
//    const transformComponent = TransformComponentArray.getComponent(wraith);
//    const hitbox = transformComponent.children[0] as Hitbox;
//    const tile = getHitboxTile(hitbox);
   
//    const layer = getEntityLayer(wraith);
//    const localBiome = layer.getTileLocalBiome(tile);
   
//    const wraithComponent = WraithComponentArray.getComponent(wraith);
//    wraithComponent.homeBiome = localBiome;
// }

// const isTarget = (entity: Entity): boolean => {
//    // @HACK @TEMPORARY cuz im doing the hack where i set snobe collision mask to 0 when they are dug in
//    if (getEntityType(entity) === EntityType.snobe) {
//       const transformComponent = TransformComponentArray.getComponent(entity);
//       const hitbox = transformComponent.children[0] as Hitbox;
//       if (hitbox.collisionMask === 0) {
//          return false;
//       }
//    }
   
   
//    const entityType = getEntityType(entity);
//    // @HACK @INCOMPLETE
//    return entityType === EntityType.player || entityType === EntityType.snobe
// }

// const getTarget = (wraith: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
//    const transformComponent = TransformComponentArray.getComponent(wraith);
//    const hitbox = transformComponent.children[0] as Hitbox;
   
//    let target: Entity | null = null;
//    let minDist = Number.MAX_SAFE_INTEGER;
//    for (const entity of aiHelperComponent.visibleEntities) {
//       if (!isTarget(entity)) {
//          continue;
//       }

//       const entityTransformComponent = TransformComponentArray.getComponent(entity);
//       const targetHitbox = entityTransformComponent.children[0] as Hitbox;
//       const dist = hitbox.box.position.calculateDistanceBetween(targetHitbox.box.position);
//       if (dist < minDist) {
//          minDist = dist;
//          target = entity;
//       }
//    }

//    return target;
// }

// function onTick(wraith: Entity): void {
//    const wraithComponent = WraithComponentArray.getComponent(wraith);
//    if (wraithComponent.leapCooldownTicks > 0) {
//       wraithComponent.leapCooldownTicks--;
//    }
//    if (wraithComponent.chompersCooldownTicks > 0) {
//       wraithComponent.chompersCooldownTicks--;
//    }
   
//    const transformComponent = TransformComponentArray.getComponent(wraith);
//    const aiHelperComponent = AIHelperComponentArray.getComponent(wraith);

//    const headHitbox = transformComponent.children[1] as Hitbox;
      
//    // Eat snobe meat
//    // @Copynpaste from yeti component and snobe component!
//    {
//       let minDist = Number.MAX_SAFE_INTEGER;
//       let closestFoodItem: Entity | null = null;
//       for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
//          const entity = aiHelperComponent.visibleEntities[i];
//          if (getEntityType(entity) !== EntityType.itemEntity) {
//             continue;
//          }

//          const itemComponent = ItemComponentArray.getComponent(entity);
//          if (itemComponent.itemType === ItemType.rawSnobeMeat) {
//             const entityTransformComponent = TransformComponentArray.getComponent(entity);
//             const entityHitbox = entityTransformComponent.children[0] as Hitbox;
            
//             const distance = headHitbox.box.position.calculateDistanceBetween(entityHitbox.box.position);
//             if (distance < minDist) {
//                minDist = distance;
//                closestFoodItem = entity;
//             }
//          }
//       }
//       if (closestFoodItem !== null) {
//          // If waiting until the wraith can chomp again, just stay still and do nothing
//          if (wraithComponent.chompersCooldownTicks > 0) {
//             return;
//          }
         
//          const foodTransformComponent = TransformComponentArray.getComponent(closestFoodItem);
//          const foodHitbox = foodTransformComponent.children[0] as Hitbox;
         
//          aiHelperComponent.turnFunc(wraith, foodHitbox.box.position, 14 * Math.PI, 0.7);
//          aiHelperComponent.moveFunc(wraith, foodHitbox.box.position, 750);

//          if (hitboxIsCollidingWithEntity(headHitbox, closestFoodItem)) {
//             healEntity(wraith, 3, wraith);
//             destroyEntity(closestFoodItem);

//             wraithComponent.chompersCooldownTicks = EAT_CHOMP_COOLDOWN_TICKS;
            
//             const itemComponent = ItemComponentArray.getComponent(closestFoodItem);
//             if (itemComponent.throwingEntity !== null) {
//                const tamingComponent = TamingComponentArray.getComponent(wraith);
//                tamingComponent.foodEatenInTier++;
//             }

//             // @Hack`
//             const tickEvent: EntityTickEvent = {
//                entityID: wraith,
//                type: EntityTickEventType.cowEat,
//                data: 0
//             };
//             registerEntityTickEvent(wraith, tickEvent);
//          }
//          return;
//       }
//    }

//    const target = getTarget(wraith, aiHelperComponent);
//    if (target !== null) {
//       const headHitbox = transformComponent.children[1] as Hitbox;

//       const targetTransformComponent = TransformComponentArray.getComponent(target);
//       const targetHitbox = targetTransformComponent.children[0] as Hitbox;

//       const headToTarget = headHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
//       const distFromTarget = getDistanceFromPointToHitbox(headHitbox.box.position, targetHitbox);

//       if (!wraithComponent.isLeaping && wraithComponent.leapCooldownTicks === 0 && distFromTarget <= LEAP_START_DISTANCE && getAbsAngleDiff(headHitbox.box.angle, headToTarget) < 0.36) {
//          wraithComponent.isChargingLeap = true;
//       }

//       if (wraithComponent.isChargingLeap && wraithComponent.leapChargeTicks < LEAP_CHARGE_TICKS) {
//          wraithComponent.leapChargeTicks++;
//       }

//       if (!wraithComponent.isLeaping && wraithComponent.leapChargeTicks >= LEAP_CHARGE_TICKS) {
//          // Stop charging leap and leap!
         
//          wraithComponent.isChargingLeap = false;
//          wraithComponent.leapChargeTicks = 0;
//          wraithComponent.isLeaping = true;
//          wraithComponent.leapElapsedTicks = 0;

//          wraithComponent.chompersCooldownTicks = LEAP_CHOMP_COOLDOWN_TICKS;

//          const tickEvent: EntityTickEvent = {
//             entityID: wraith,
//             type: EntityTickEventType.wraithAngryLeap,
//             data: 0
//          };
//          registerEntityTickEvent(wraith, tickEvent);

//          // Initial jump
//          const bodyHitbox = transformComponent.children[0] as Hitbox;
//          const bodyToTargetDir = bodyHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
//          addHitboxVelocity(bodyHitbox, polarVec2(300, bodyToTargetDir));

//          const headToTargetDir = headHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
//          addHitboxVelocity(headHitbox, polarVec2(300, headToTargetDir));
//       }

//       if (wraithComponent.isChargingLeap) {
//          aiHelperComponent.turnFunc(wraith, targetHitbox.box.position, 14 * Math.PI, 0.7);

//          // @HACK @Copynpaste from the moveFunc function, cuz this is what moves the head . _.
//          {
//             const headHitbox = transformComponent.children[1] as Hitbox;
//             const headToTargetDirection = headHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
//             // @Hack?
//             const headAcceleration = 1200;
//             applyAcceleration(headHitbox, polarVec2(headAcceleration, headToTargetDirection));
//          }
//       } else if (wraithComponent.isLeaping) {
//          aiHelperComponent.turnFunc(wraith, targetHitbox.box.position, 14 * Math.PI, 0.7);
//          // @HACK @Copynpaste from the moveFunc function, cuz this is what moves the head . _.
//          {
//             const headHitbox = transformComponent.children[1] as Hitbox;
//             const headToTargetDirection = headHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
//             // @Hack?
//             const headAcceleration = 1200;
//             applyAcceleration(headHitbox, polarVec2(headAcceleration, headToTargetDirection));
//          }
         
//          wraithComponent.leapElapsedTicks++;
//          if (wraithComponent.leapElapsedTicks >= LEAP_DURATION_TICKS) {
//             wraithComponent.isLeaping = false;
//             wraithComponent.leapCooldownTicks = LEAP_COOLDOWN_TICKS;
//          }
//       } else {
//          if (distFromTarget > LEAP_START_DISTANCE - 15) {
//             aiHelperComponent.moveFunc(wraith, targetHitbox.box.position, 1200);
//          } else {
//             // @HACK @Copynpaste from the moveFunc function, cuz this is what moves the head . _.
//             {
//                const headHitbox = transformComponent.children[1] as Hitbox;
//                const headToTargetDirection = headHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
//                // @Hack?
//                const headAcceleration = 1200;
//                applyAcceleration(headHitbox, polarVec2(headAcceleration, headToTargetDirection));
//             }
//          }
//          aiHelperComponent.turnFunc(wraith, targetHitbox.box.position, 14 * Math.PI, 0.7);

//          if (customTickIntervalHasPassed(getEntityAgeTicks(wraith), 0.5)) {
//             const tickEvent: EntityTickEvent = {
//                entityID: wraith,
//                type: EntityTickEventType.wraithPant,
//                data: 0
//             };
//             registerEntityTickEvent(wraith, tickEvent);
//          }
//       }

//       return;
//    }

//    // If not in its home biome, move back to home
//    if (wraithComponent.homeBiome !== null) {
//       const bodyHitbox = transformComponent.children[0] as Hitbox;

//       const layer = getEntityLayer(wraith);
//       const tile = getHitboxTile(bodyHitbox);
//       if (layer.getTileType(tile) !== TileType.permafrost) {
//          const homePos = new Point(wraithComponent.homeBiome.centerX, wraithComponent.homeBiome.centerY);
//          // @HACK this should use pathfinding to get back
//          aiHelperComponent.moveFunc(wraith, homePos, 750);
//          aiHelperComponent.turnFunc(wraith, homePos, 14 * Math.PI, 0.7);
//          return;
//       }
//    }
   
//    // Wander AI
//    const wanderAI = aiHelperComponent.getWanderAI();
//    wanderAI.update(wraith);
//    if (wanderAI.targetPosition !== null) {
//       aiHelperComponent.moveFunc(wraith, wanderAI.targetPosition, wanderAI.acceleration);
//       aiHelperComponent.turnFunc(wraith, wanderAI.targetPosition, wanderAI.turnSpeed, wanderAI.turnDamping);
//    }
// }

// function getDataLength(): number {
//    return 0;
// }

// function addDataToPacket(): void {}

// function onHitboxCollision(wraith: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
//    if (affectedHitbox.flags.includes(HitboxFlag.WRAITH_HEAD)) {
//       const wraithComponent = WraithComponentArray.getComponent(wraith);
//       if (!wraithComponent.isLeaping) {
//          return;
//       }
      
//       if (!isTarget(collidingEntity)) {
//          return;
//       }
      
//       if (!HealthComponentArray.hasComponent(collidingEntity)) {
//          return;
//       }
   
//       const localInvulnerabilityHash = "wraith" + wraith;
      
//       const healthComponent = HealthComponentArray.getComponent(collidingEntity);
//       if (!canDamageEntity(healthComponent, localInvulnerabilityHash)) {
//          return;
//       }
   
//       const hitDir = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);
   
//       damageEntity(collidingEntity, collidingHitbox, wraith, 3, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
//       applyAbsoluteKnockback(collidingEntity, collidingHitbox, polarVec2(200, hitDir));
//       addLocalInvulnerabilityHash(collidingEntity, localInvulnerabilityHash, 0.3);

//       if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
//          applyStatusEffect(collidingEntity, StatusEffect.freezing, 3 * Settings.TPS);
//       }
//    }
// }