import { DamageSource, Entity, RockSpikeProjectileSize } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityAgeTicks } from "../world";
import { Settings } from "battletribes-shared/settings";
import { Point, randFloat } from "battletribes-shared/utils";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback, Hitbox } from "../hitboxes";

export class RockSpikeComponent {
   public readonly size: RockSpikeProjectileSize;
   public readonly lifetimeTicks = Math.floor(randFloat(3.5, 4.5) * Settings.TPS);
   public readonly frozenYeti: Entity;

   constructor(size: number, frozenYeti: Entity) {
      this.size = size;
      this.frozenYeti = frozenYeti;
   }
}

export const RockSpikeComponentArray = new ComponentArray<RockSpikeComponent>(ServerComponentType.rockSpike, true, getDataLength, addDataToPacket);
RockSpikeComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
RockSpikeComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(rockSpike: Entity): void {
   const rockSpikeComponent = RockSpikeComponentArray.getComponent(rockSpike);
   
   // Remove if past lifetime
   const ageTicks = getEntityAgeTicks(rockSpike);
   if (ageTicks >= rockSpikeComponent.lifetimeTicks) {
      destroyEntity(rockSpike);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const rockSpikeComponent = RockSpikeComponentArray.getComponent(entity);

   packet.addNumber(rockSpikeComponent.size);
   packet.addNumber(rockSpikeComponent.lifetimeTicks);
}

function onHitboxCollision(rockSpikeProjectile: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const rockSpikeProjectileComponent = RockSpikeComponentArray.getComponent(rockSpikeProjectile);

   // Don't hurt the yeti which created the spike
   if (collidingEntity === rockSpikeProjectileComponent.frozenYeti) {
      return;
   }
   
   // Damage the entity
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "rock_spike")) {
         return;
      }
      
      const hitDirection = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);
      
      damageEntity(collidingEntity, collidingHitbox, null, 5, DamageSource.rockSpike, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, collidingHitbox, 200, hitDirection);
      addLocalInvulnerabilityHash(collidingEntity, "rock_spike", 0.3);
   }
}