import { Hitbox } from "battletribes-shared/boxes/boxes";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, DamageSource } from "battletribes-shared/entities";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { Point, randFloat, randInt } from "battletribes-shared/utils";
import { getEntityAgeTicks, destroyEntity, entityExists } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback } from "./PhysicsComponent";
import { ProjectileComponentArray } from "./ProjectileComponent";
import { TransformComponentArray } from "./TransformComponent";

export class GuardianGemFragmentProjectileComponent {
   public readonly fragmentShape = randInt(0, 2);
   public readonly gemType = randInt(0, 2);
   public readonly tintMultiplier = randFloat(0.5, 1);
}

export const GuardianGemFragmentProjectileComponentArray = new ComponentArray<GuardianGemFragmentProjectileComponent>(ServerComponentType.guardianGemFragmentProjectile, true, getDataLength, addDataToPacket);
GuardianGemFragmentProjectileComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
GuardianGemFragmentProjectileComponentArray.onWallCollision = onWallCollision;
GuardianGemFragmentProjectileComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(fragment: Entity): void {
   const age = getEntityAgeTicks(fragment);
   if (age >= Settings.TPS * 0.75) {
      destroyEntity(fragment);
   }
}

function onWallCollision(fragment: Entity): void {
   destroyEntity(fragment);
}

function onHitboxCollision(fragment: Entity, collidingEntity: Entity, _pushedHitbox: Hitbox, _pushingHitbox: Hitbox, collisionPoint: Point): void {
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "gemFragmentProjectile")) {
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(fragment);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      
      const fragmentHitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

      damageEntity(collidingEntity, fragment, 1, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 50, fragmentHitDirection);

      const projectileComponent = ProjectileComponentArray.getComponent(fragment);
      if (entityExists(projectileComponent.creator)) {
         const guardianTransformComponent = TransformComponentArray.getComponent(projectileComponent.creator);

         const directionFromGuardian = guardianTransformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
         applyKnockback(collidingEntity, 100, directionFromGuardian);
      }
      
      addLocalInvulnerabilityHash(collidingEntity, "gemFragmentProjectile", 0.166);
   }
}

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const guardianGemFragmentProjectileComponent = GuardianGemFragmentProjectileComponentArray.getComponent(entity);
   packet.addNumber(guardianGemFragmentProjectileComponent.fragmentShape);
   packet.addNumber(guardianGemFragmentProjectileComponent.gemType);
   packet.addNumber(guardianGemFragmentProjectileComponent.tintMultiplier);
}