import { Hitbox } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType, DamageSource } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Point } from "../../../shared/src/utils";
import { getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback } from "./PhysicsComponent";

export class SpikyBastardComponent {}

export const SpikyBastardComponentArray = new ComponentArray<SpikyBastardComponent>(ServerComponentType.spikyBastard, true, getDataLength, addDataToPacket,);
SpikyBastardComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

function onHitboxCollision(bastard: Entity, collidingEntity: Entity, actingHitbox: Hitbox, receivingHitbox: Hitbox, collisionPoint: Point): void {
   if (getEntityType(collidingEntity) === EntityType.glurb) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "spikyBastard")) {
      return;
   }

   const hitDirection = actingHitbox.box.position.calculateAngleBetween(receivingHitbox.box.position);

   damageEntity(collidingEntity, bastard, 1, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 100, hitDirection);
   addLocalInvulnerabilityHash(healthComponent, "spikyBastard", 0.3);
}