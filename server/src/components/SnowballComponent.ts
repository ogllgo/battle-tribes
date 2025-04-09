import { Entity, EntityType, DamageSource, SnowballSize } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Point, randFloat } from "battletribes-shared/utils";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityAgeTicks, getEntityType } from "../world";
import { Settings } from "battletribes-shared/settings";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { HealthComponentArray, canDamageEntity, hitEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback, getHitboxVelocity, Hitbox } from "../hitboxes";
import { TransformComponentArray } from "./TransformComponent";

export class SnowballComponent {
   public readonly yeti: Entity;
   public readonly size: SnowballSize;
   public readonly lifetimeTicks = Math.floor(randFloat(10, 15) * Settings.TPS);

   constructor(yeti: Entity, size: SnowballSize) {
      this.yeti = yeti;
      this.size = size;
   }
}

const DAMAGE_VELOCITY_THRESHOLD = 100;

export const SnowballComponentArray = new ComponentArray<SnowballComponent>(ServerComponentType.snowball, true, getDataLength, addDataToPacket);
SnowballComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
SnowballComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(snowball: Entity): void {
   // Decrease angular velocity over time
   // @INCOMPLETE!
   // const transformComponent = TransformComponentArray.getComponent(snowball);
   // const hitbox = transformComponent.children[0] as Hitbox;
   // if (hitbox.angleTurnSpeed !== 0) {
   //    const beforeSign = Math.sign(hitbox.angleTurnSpeed);
   //    hitbox.angleTurnSpeed -= Math.PI / Settings.TPS * beforeSign;
   //    if (beforeSign !== Math.sign(hitbox.angleTurnSpeed)) {
   //       hitbox.angleTurnSpeed = 0;
   //    }
   // }
         
   const snowballComponent = SnowballComponentArray.getComponent(snowball);
   const ageTicks = getEntityAgeTicks(snowball);
   if (ageTicks >= snowballComponent.lifetimeTicks) {
      destroyEntity(snowball);
   }
}

function onHitboxCollision(snowball: Entity, collidingEntity: Entity, snowballHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.snowball || collidingEntityType === EntityType.iceSpikes) {
      return;
   }

   // Don't let the snowball damage the yeti which threw it
   if (collidingEntityType === EntityType.yeti) {
      const snowballComponent = SnowballComponentArray.getComponent(snowball);
      if (collidingEntity === snowballComponent.yeti) {
         return;
      }
   }
   
   const velocity = getHitboxVelocity(snowballHitbox).length();

   const ageTicks = getEntityAgeTicks(snowball);
   if (velocity < DAMAGE_VELOCITY_THRESHOLD || ageTicks >= 2 * Settings.TPS) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (canDamageEntity(healthComponent, "snowball")) {
         const hitDirection = snowballHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);

         hitEntity(collidingEntity, null, 4, DamageSource.snowball, AttackEffectiveness.effective, collisionPoint, 0);
         applyKnockback(collidingEntity, collidingHitbox, 100, hitDirection);
         addLocalInvulnerabilityHash(collidingEntity, "snowball", 0.3);
      }
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const snowballComponent = SnowballComponentArray.getComponent(entity);
   packet.addNumber(snowballComponent.size);
}