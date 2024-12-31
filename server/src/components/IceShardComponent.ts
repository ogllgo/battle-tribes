import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Point, randFloat } from "battletribes-shared/utils";
import { Entity, EntityType, DamageSource } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { destroyEntity, getEntityAgeTicks, getEntityType } from "../world";
import { Hitbox } from "battletribes-shared/boxes/boxes";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { StatusEffect } from "battletribes-shared/status-effects";
import { HealthComponentArray, damageEntity, canDamageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent";
import { TransformComponentArray } from "./TransformComponent";
import { applyKnockback } from "./PhysicsComponent";

export class IceShardComponent {
   public readonly lifetime = randFloat(0.1, 0.2);
}

export const IceShardComponentArray = new ComponentArray<IceShardComponent>(ServerComponentType.iceShard, true, getDataLength, addDataToPacket);
IceShardComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
IceShardComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(iceShard: Entity): void {
   const iceShardComponent = IceShardComponentArray.getComponent(iceShard);
   
   // @Cleanup @Speed: Don't even need a component for this, just do it based on age with a random chance
   const ageTicks = getEntityAgeTicks(iceShard);
   if (ageTicks / Settings.TPS >= iceShardComponent.lifetime) {
      destroyEntity(iceShard);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

function onHitboxCollision(iceShard: Entity, collidingEntity: Entity, _pushedHitbox: Hitbox, _pushingHitbox: Hitbox, collisionPoint: Point): void {
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Shatter the ice spike
   destroyEntity(iceShard);

   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.iceSpikes || collidingEntityType === EntityType.iceSpikesPlanted) {
      // Instantly destroy ice spikes
      damageEntity(collidingEntity, null, 99999, DamageSource.iceShards, AttackEffectiveness.effective, collisionPoint, 0);
   } else {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "ice_shards")) {
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(iceShard);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

      damageEntity(collidingEntity, null, 2, DamageSource.iceShards, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 150, hitDirection);
      addLocalInvulnerabilityHash(collidingEntity, "ice_shards", 0.3);

      if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
         applyStatusEffect(collidingEntity, StatusEffect.freezing, 3 * Settings.TPS);
      }
   }
}