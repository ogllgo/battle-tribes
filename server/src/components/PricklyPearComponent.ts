import CircularBox from "../../../shared/src/boxes/CircularBox";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { ItemType } from "../../../shared/src/items/items";
import { Point, randFloat, randSign } from "../../../shared/src/utils";
import { createPricklyPearFragmentProjectileConfig } from "../entities/desert/prickly-pear-fragment-projectile";
import { createItemEntityConfig } from "../entities/item-entity";
import { createEntity } from "../Entity";
import { Hitbox, setHitboxAngularVelocity } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { destroyEntity, getEntityLayer } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray } from "./HealthComponent";
import { TransformComponentArray } from "./TransformComponent";

export class PricklyPearComponent {}

export const PricklyPearComponentArray = new ComponentArray<PricklyPearComponent>(ServerComponentType.pricklyPear, true, getDataLength, addDataToPacket);
PricklyPearComponentArray.onTakeDamage = onTakeDamage;

const explode = (pricklyPear: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(pricklyPear);
   const hitbox = transformComponent.children[0] as Hitbox;

   const layer = getEntityLayer(pricklyPear);

   const parentCactus = transformComponent.parentEntity;
   
   const numProjectiles = 9;
   for (let i = 0; i < numProjectiles; i++) {
      const offsetDirection = hitbox.box.angle + 2 * Math.PI * i / numProjectiles + randFloat(-0.1, 0.1);
      const offsetMagnitude = (hitbox.box as CircularBox).radius;
      const offsetX = offsetMagnitude * Math.sin(offsetDirection);
      const offsetY = offsetMagnitude * Math.cos(offsetDirection);

      const x = hitbox.box.position.x + offsetX;
      const y = hitbox.box.position.y + offsetY;
      const projectileConfig = createPricklyPearFragmentProjectileConfig(new Point(x, y), 2 * Math.PI * Math.random(), parentCactus);

      const projectileTransformComponent = projectileConfig.components[ServerComponentType.transform]!;
      const projectileHitbox = projectileTransformComponent.children[0] as Hitbox;
      projectileHitbox.velocity.x = 520 * Math.sin(offsetDirection);
      projectileHitbox.velocity.y = 520 * Math.cos(offsetDirection);
      setHitboxAngularVelocity(projectileHitbox, randSign() * randFloat(2 * Math.PI, 3 * Math.PI));
      
      createEntity(projectileConfig, layer, 0);
   }
}

const drop = (pricklyPear: Entity): void => {
   destroyEntity(pricklyPear);
   
   const transformComponent = TransformComponentArray.getComponent(pricklyPear);
   const hitbox = transformComponent.children[0] as Hitbox;

   const layer = getEntityLayer(pricklyPear);

   const parentCactus = transformComponent.parentEntity;
   const cactusTransformComponent = TransformComponentArray.getComponent(parentCactus);
   const cactusHitbox = cactusTransformComponent.children[0] as Hitbox;
   const angleFromCactusToPear = cactusHitbox.box.position.calculateAngleBetween(hitbox.box.position);
   
   const x = hitbox.box.position.x + 8 * Math.sin(angleFromCactusToPear);
   const y = hitbox.box.position.y + 8 * Math.cos(angleFromCactusToPear);
   
   const itemConfig = createItemEntityConfig(new Point(x, y), hitbox.box.angle, ItemType.pricklyPear, 1, null);

   const itemTransformComponent = itemConfig.components[ServerComponentType.transform]!;
   const itemHitbox = itemTransformComponent.children[0] as Hitbox;
   itemHitbox.velocity.x = 150 * Math.sin(angleFromCactusToPear);
   itemHitbox.velocity.y = 150 * Math.cos(angleFromCactusToPear);

   createEntity(itemConfig, layer, 0);
}

function onTakeDamage(pricklyPear: Entity): void {
   const healthComponent = HealthComponentArray.getComponent(pricklyPear);

   // If the hit was enough to kill the pear, explode it (!)
   if (healthComponent.health <= 0) {
      explode(pricklyPear);
   } else {
      drop(pricklyPear);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}