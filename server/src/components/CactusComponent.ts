import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType, DamageSource, CactusFlowerSize } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "battletribes-shared/packets";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Point, polarVec2, randAngle, randInt } from "../../../shared/src/utils";
import { getEntityType, destroyEntity, getEntityLayer } from "../world";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyAbsoluteKnockback, Hitbox } from "../hitboxes";
import { Settings } from "../../../shared/src/settings";
import { entityChildIsEntity, TransformComponent, TransformComponentArray } from "./TransformComponent";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import { createPricklyPearConfig } from "../entities/desert/prickly-pear";
import { createEntityConfigAttachInfo } from "../components";
import { createEntity } from "../Entity";

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

   public remainingFruitGrowTicks = randInt(MIN_FRUIT_GROW_TICKS, MAX_FRUIT_GROW_TICKS);
   public readonly canHaveFruit: boolean;

   constructor(flowers: ReadonlyArray<CactusFlower>, canHaveFruit: boolean) {
      this.flowers = flowers;
      this.canHaveFruit = canHaveFruit;
   }
}

const MIN_FRUIT_GROW_TICKS = 180 * Settings.TPS;
const MAX_FRUIT_GROW_TICKS = 300 * Settings.TPS;

export const CactusComponentArray = new ComponentArray<CactusComponent>(ServerComponentType.cactus, true, getDataLength, addDataToPacket);
CactusComponentArray.onHitboxCollision = onHitboxCollision;
CactusComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const hasFruit = (transformComponent: TransformComponent): boolean => {
   for (const child of transformComponent.children) {
      if (entityChildIsEntity(child) && getEntityType(child.attachedEntity) === EntityType.pricklyPear) {
         return true;
      }
   }

   return false;
}

function onTick(cactus: Entity): void {
   const cactusComponent = CactusComponentArray.getComponent(cactus);
   if (cactusComponent.canHaveFruit) {
      const transformComponent = TransformComponentArray.getComponent(cactus);
      if (!hasFruit(transformComponent)) {
         if (cactusComponent.remainingFruitGrowTicks <= 0) {
            // @Copynpaste
            
            const cactusHitbox = transformComponent.children[0] as Hitbox;
            const cactusRadius = (cactusHitbox.box as CircularBox).radius;
      
            const offsetDirection = randAngle();
            const offsetX = cactusRadius * Math.sin(offsetDirection);
            const offsetY = cactusRadius * Math.cos(offsetDirection);
      
            const x = cactusHitbox.box.position.x + offsetX;
            const y = cactusHitbox.box.position.y + offsetY;
            const position = new Point(x, y);
            
            const fruitConfig = createPricklyPearConfig(position, randAngle());
            fruitConfig.attachInfo = createEntityConfigAttachInfo(cactus, cactusHitbox, true);
            createEntity(fruitConfig, getEntityLayer(cactus), 0);
      
            cactusComponent.remainingFruitGrowTicks = randInt(MIN_FRUIT_GROW_TICKS, MAX_FRUIT_GROW_TICKS);
         } else {
            cactusComponent.remainingFruitGrowTicks--;
         }
      }
   }
}

function getDataLength(entity: Entity): number {
   const cactusComponent = CactusComponentArray.getComponent(entity);
   return Float32Array.BYTES_PER_ELEMENT + cactusComponent.flowers.length * 6 * Float32Array.BYTES_PER_ELEMENT;
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

   if (getEntityType(collidingEntity) === EntityType.tumbleweedDead || getEntityType(collidingEntity) === EntityType.dustflea) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "cactus")) {
      return;
   }

   const hitDir = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);

   damageEntity(collidingEntity, collidingHitbox, cactus, 1, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingEntity, collidingHitbox, polarVec2(200, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, "cactus", 0.3);
}