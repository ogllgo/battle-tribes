import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { applyKnockback, PhysicsComponentArray } from "./PhysicsComponent";
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

export const SlimeSpitComponentArray = new ComponentArray<SlimeSpitComponent>(ServerComponentType.slimeSpit, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onHitboxCollision: onHitboxCollision,
   preRemove: preRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(spit: EntityID): void {
   const physicsComponent = PhysicsComponentArray.getComponent(spit);

   const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
   const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
   if (vx * vx + vy * vy <= Vars.BREAK_VELOCITY * Vars.BREAK_VELOCITY) {
      destroyEntity(spit);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const slimeSpitComponent = SlimeSpitComponentArray.getComponent(entity);
   packet.addNumber(slimeSpitComponent.size);
}

function preRemove(spit: EntityID): void {
   const spitComponent = SlimeSpitComponentArray.getComponent(spit);
   if (spitComponent.size === 1) {
      const transformComponent = TransformComponentArray.getComponent(spit);

      const config = createSpitPoisonAreaConfig();
      config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
      config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
      config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      createEntity(config, getEntityLayer(spit), 0);
   }
}

function onHitboxCollision(spit: EntityID, collidingEntity: EntityID, actingHitbox: Hitbox, receivingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.slime || collidingEntityType === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const spitComponent = SlimeSpitComponentArray.getComponent(spit);
   const damage = spitComponent.size === 0 ? 2 : 3;

   const hitDirection = actingHitbox.box.position.calculateAngleBetween(receivingHitbox.box.position);

   damageEntity(collidingEntity, spit, damage, PlayerCauseOfDeath.poison, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 150, hitDirection);
   
   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 2 * Settings.TPS);
   }

   destroyEntity(spit);
}