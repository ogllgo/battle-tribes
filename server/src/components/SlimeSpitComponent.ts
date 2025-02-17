import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType, DamageSource } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { applyKnockback } from "./PhysicsComponent";
import { destroyEntity, getEntityLayer, getEntityType } from "../world";
import { TransformComponentArray } from "./TransformComponent";
import { createSpitPoisonAreaConfig } from "../entities/projectiles/spit-poison-area";
import { createEntity } from "../Entity";
import { Hitbox } from "../../../shared/src/boxes/boxes";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Settings } from "../../../shared/src/settings";
import { StatusEffect } from "../../../shared/src/status-effects";
import { Point } from "../../../shared/src/utils";
import { HealthComponentArray, damageEntity } from "./HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent";

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

   const vx = transformComponent.selfVelocity.x + transformComponent.externalVelocity.x;
   const vy = transformComponent.selfVelocity.y + transformComponent.externalVelocity.y;
   if (vx * vx + vy * vy <= Vars.BREAK_VELOCITY * Vars.BREAK_VELOCITY) {
      destroyEntity(spit);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const slimeSpitComponent = SlimeSpitComponentArray.getComponent(entity);
   packet.addNumber(slimeSpitComponent.size);
}

function preRemove(spit: Entity): void {
   const spitComponent = SlimeSpitComponentArray.getComponent(spit);
   if (spitComponent.size === 1) {
      const transformComponent = TransformComponentArray.getComponent(spit);

      const config = createSpitPoisonAreaConfig();
      config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
      config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
      config.components[ServerComponentType.transform].relativeRotation = 2 * Math.PI * Math.random();
      createEntity(config, getEntityLayer(spit), 0);
   }
}

function onHitboxCollision(spit: Entity, collidingEntity: Entity, actingHitbox: Hitbox, receivingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.slime || collidingEntityType === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const spitComponent = SlimeSpitComponentArray.getComponent(spit);
   const damage = spitComponent.size === 0 ? 2 : 3;

   const hitDirection = actingHitbox.box.position.calculateAngleBetween(receivingHitbox.box.position);

   damageEntity(collidingEntity, spit, damage, DamageSource.poison, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 150, hitDirection);
   
   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 2 * Settings.TPS);
   }

   destroyEntity(spit);
}