import { ServerComponentType } from "../../../shared/src/components";
import { Entity, DamageSource } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Point } from "../../../shared/src/utils";
import { applyKnockback, Hitbox } from "../hitboxes";
import { ComponentArray } from "./ComponentArray";
import { GlurbSegmentComponentArray } from "./GlurbSegmentComponent";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";

export class SpikyBastardComponent {}

export const SpikyBastardComponentArray = new ComponentArray<SpikyBastardComponent>(ServerComponentType.spikyBastard, true, getDataLength, addDataToPacket,);
SpikyBastardComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(bastard: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   if (GlurbSegmentComponentArray.hasComponent(collidingEntity)) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "spikyBastard")) {
      return;
   }

   const hitDirection = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);

   damageEntity(collidingEntity, collidingHitbox, bastard, 1, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, collidingHitbox, 100, hitDirection);
   addLocalInvulnerabilityHash(collidingEntity, "spikyBastard", 0.3);
}