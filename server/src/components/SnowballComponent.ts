import { Entity, EntityType, DamageSource, SnowballSize } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { applyKnockback, getVelocityX, getVelocityY, PhysicsComponentArray } from "./PhysicsComponent";
import { Point, randFloat, randSign } from "battletribes-shared/utils";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityAgeTicks, getEntityType } from "../world";
import { Settings } from "battletribes-shared/settings";
import { Hitbox } from "../../../shared/src/boxes/boxes";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
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
SnowballComponentArray.onJoin = onJoin;
SnowballComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
SnowballComponentArray.onHitboxCollision = onHitboxCollision;

function onJoin(entity: Entity): void {
   /** Set the snowball to spin */
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   physicsComponent.angularVelocity = randFloat(1, 2) * Math.PI * randSign();
}

function onTick(snowball: Entity): void {
   const snowballComponent = SnowballComponentArray.getComponent(snowball);
   
   // @Incomplete. we use physics component angular velocity now, but that doesn't decrease over time!
   // Angular velocity
   // if (snowballComponent.angularVelocity !== 0) {
      //    snowball.rotation += snowballComponent.angularVelocity / Settings.TPS;
      
      //    const physicsComponent = PhysicsComponentArray.getComponent(snowball.id);
      //    physicsComponent.hitboxesAreDirty = true;
      
      //    const beforeSign = Math.sign(snowballComponent.angularVelocity);
      //    snowballComponent.angularVelocity -= Math.PI / Settings.TPS * beforeSign;
      //    if (beforeSign !== Math.sign(snowballComponent.angularVelocity)) {
         //       snowballComponent.angularVelocity = 0;
         //    }
         // }
         
   const ageTicks = getEntityAgeTicks(snowball);
   if (ageTicks >= snowballComponent.lifetimeTicks) {
      destroyEntity(snowball);
   }
}

function onHitboxCollision(snowball: Entity, collidingEntity: Entity, snowballHitbox: Hitbox, pushedHitbox: Hitbox, collisionPoint: Point): void {
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
   
   const transformComponent = TransformComponentArray.getComponent(snowball);

   const vx = getVelocityX(transformComponent);
   const vy = getVelocityY(transformComponent);
   const velocity = Math.sqrt(vx * vx + vy * vy);

   const ageTicks = getEntityAgeTicks(snowball);
   if (velocity < DAMAGE_VELOCITY_THRESHOLD || ageTicks >= 2 * Settings.TPS) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (canDamageEntity(healthComponent, "snowball")) {
         const hitDirection = snowballHitbox.box.position.calculateAngleBetween(pushedHitbox.box.position);

         damageEntity(collidingEntity, null, 4, DamageSource.snowball, AttackEffectiveness.effective, collisionPoint, 0);
         applyKnockback(collidingEntity, 100, hitDirection);
         addLocalInvulnerabilityHash(collidingEntity, "snowball", 0.3);
      }
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const snowballComponent = SnowballComponentArray.getComponent(entity);
   packet.addNumber(snowballComponent.size);
}