import { ServerComponentType } from "../../../shared/src/components";
import { Entity, DamageSource } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Packet } from "../../../shared/src/packets";
import { Point, randInt } from "../../../shared/src/utils";
import { Hitbox, applyKnockback } from "../hitboxes";
import { destroyEntity } from "../world";
import { ComponentArray } from "./ComponentArray";
import { addLocalInvulnerabilityHash, canDamageEntity, HealthComponentArray, hitEntity } from "./HealthComponent";
import { TransformComponentArray } from "./TransformComponent";

export class PricklyPearFragmentProjectileComponent {
   public readonly variant = randInt(0, 1);
   public readonly parentCactus: Entity;
   
   constructor(parentCactus: Entity) {
      this.parentCactus = parentCactus;
   }
}

export const PricklyPearFragmentProjectileComponentArray = new ComponentArray<PricklyPearFragmentProjectileComponent>(ServerComponentType.pricklyPearFragmentProjectile, true, getDataLength, addDataToPacket);
PricklyPearFragmentProjectileComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
PricklyPearFragmentProjectileComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(fragment: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(fragment);
   const hitbox = transformComponent.children[0] as Hitbox;

   if (hitbox.velocity.length() < 200) {
      destroyEntity(fragment);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, fragment: Entity): void {
   const pricklyPearFragmentProjectileComponent = PricklyPearFragmentProjectileComponentArray.getComponent(fragment);
   packet.addNumber(pricklyPearFragmentProjectileComponent.variant);
}

function onHitboxCollision(fragment: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const pricklyPearFragmentProjectileComponent = PricklyPearFragmentProjectileComponentArray.getComponent(fragment);
   if (collidingEntity === pricklyPearFragmentProjectileComponent.parentCactus) {
      destroyEntity(fragment);
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, fragment.toString())) {
      return;
   }

   const hitDirection = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);

   hitEntity(collidingEntity, fragment, 3, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, collidingHitbox, 100, hitDirection);
   addLocalInvulnerabilityHash(collidingEntity, fragment.toString(), 0.3);
}
