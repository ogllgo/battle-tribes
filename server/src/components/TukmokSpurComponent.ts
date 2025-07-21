import { ServerComponentType } from "../../../shared/src/components";
import { Entity, DamageSource, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Point, polarVec2 } from "../../../shared/src/utils";
import { Hitbox, applyAbsoluteKnockback } from "../hitboxes";
import { getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";

export class TukmokSpurComponent {}

export const TukmokSpurComponentArray = new ComponentArray<TukmokSpurComponent>(ServerComponentType.tukmokSpur, true, getDataLength, addDataToPacket);
TukmokSpurComponentArray.onHitboxCollision = onHitboxCollision

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(tukmok: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   // @HACK so that the tukmok doesn't kill itself. but this inadvertently means tukmoks can't damage each other
   const entityType = getEntityType(collidingEntity);
   if (entityType === EntityType.tukmok || entityType === EntityType.tukmokSpur || entityType === EntityType.tukmokTrunk || entityType === EntityType.tukmokTail) {
      return;
   }

   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "tukmok-spur")) {
      return;
   }

   const hitDir = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);

   damageEntity(collidingEntity, collidingHitbox, tukmok, 3, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingEntity, collidingHitbox, polarVec2(200, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, "tukmok-spur", 0.3);
}