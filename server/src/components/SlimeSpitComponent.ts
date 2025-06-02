import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType, DamageSource } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityLayer, getEntityType } from "../world";
import { TransformComponentArray } from "./TransformComponent";
import { createSpitPoisonAreaConfig } from "../entities/projectiles/spit-poison-area";
import { createEntity } from "../Entity";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Settings } from "../../../shared/src/settings";
import { StatusEffect } from "../../../shared/src/status-effects";
import { Point } from "../../../shared/src/utils";
import { HealthComponentArray, hitEntity } from "./HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent";
import { applyKnockback, getHitboxVelocity, Hitbox } from "../hitboxes";

const enum Vars {
   BREAK_VELOCITY = 100
}

export class SlimeSpitComponent {
   public readonly size: number;

   constructor(size: number) {
      this.size = size;
   }
}

export const SlimeSpitComponentArray = new ComponentArray<SlimeSpitComponent>(ServerComponentType.slimeSpit, true, getDataLength, addDataToPacket);
SlimeSpitComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
SlimeSpitComponentArray.onHitboxCollision = onHitboxCollision;
SlimeSpitComponentArray.preRemove = preRemove;

function onTick(spit: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(spit);
   const hitbox = transformComponent.children[0] as Hitbox;
   if (getHitboxVelocity(hitbox).length() <= Vars.BREAK_VELOCITY) {
      destroyEntity(spit);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const slimeSpitComponent = SlimeSpitComponentArray.getComponent(entity);
   packet.addNumber(slimeSpitComponent.size);
}

function preRemove(spit: Entity): void {
   const spitComponent = SlimeSpitComponentArray.getComponent(spit);
   if (spitComponent.size === 1) {
      const transformComponent = TransformComponentArray.getComponent(spit);
      const spitHitbox = transformComponent.children[0] as Hitbox;

      const config = createSpitPoisonAreaConfig(spitHitbox.box.position.copy(), 2 * Math.PI * Math.random());
      createEntity(config, getEntityLayer(spit), 0);
   }
}

function onHitboxCollision(spit: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.slime || collidingEntityType === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const spitComponent = SlimeSpitComponentArray.getComponent(spit);
   const damage = spitComponent.size === 0 ? 2 : 3;

   const hitDirection = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);

   hitEntity(collidingEntity, collidingHitbox, spit, damage, DamageSource.poison, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, collidingHitbox, 150, hitDirection);
   
   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 2 * Settings.TPS);
   }

   destroyEntity(spit);
}