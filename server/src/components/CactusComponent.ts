import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType, DamageSource, CactusFlowerSize } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "battletribes-shared/packets";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Point } from "../../../shared/src/utils";
import { getEntityType, destroyEntity } from "../world";
import { HealthComponentArray, canDamageEntity, hitEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback, Hitbox } from "../hitboxes";

export interface CactusFlower {
   readonly parentHitboxLocalID: number;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly angle: number;
   readonly flowerType: number;
   readonly size: CactusFlowerSize;
}

export class CactusComponent {
   public readonly flowers: ReadonlyArray<CactusFlower>;

   constructor(flowers: ReadonlyArray<CactusFlower>) {
      this.flowers = flowers;
   }
}

export const CactusComponentArray = new ComponentArray<CactusComponent>(ServerComponentType.cactus, true, getDataLength, addDataToPacket);
CactusComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(entity: Entity): number {
   const cactusComponent = CactusComponentArray.getComponent(entity);
   return 2 * Float32Array.BYTES_PER_ELEMENT + cactusComponent.flowers.length * 6 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const cactusComponent = CactusComponentArray.getComponent(entity);

   packet.addNumber(cactusComponent.flowers.length);
   for (let i = 0; i < cactusComponent.flowers.length; i++) {
      const flower = cactusComponent.flowers[i];
      packet.addNumber(flower.parentHitboxLocalID);
      packet.addNumber(flower.offsetX);
      packet.addNumber(flower.offsetY);
      packet.addNumber(flower.angle);
      packet.addNumber(flower.flowerType);
      packet.addNumber(flower.size);
   }
}

function onHitboxCollision(cactus: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   if (getEntityType(collidingEntity) === EntityType.itemEntity) {
      destroyEntity(collidingEntity);
      return;
   }

   if (getEntityType(collidingEntity) === EntityType.krumblid) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "cactus")) {
      return;
   }

   const hitDirection = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);

   hitEntity(collidingEntity, cactus, 1, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, collidingHitbox, 200, hitDirection);
   addLocalInvulnerabilityHash(collidingEntity, "cactus", 0.3);
}