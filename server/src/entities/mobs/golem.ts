import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { distance, Point, randInt } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { GolemComponent } from "../../components/GolemComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntityConfig, EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { createHitbox, Hitbox } from "../../hitboxes";

export const enum GolemVars {
   PEBBLUM_SUMMON_COOLDOWN_TICKS = 10 * Settings.TPS
}

// @Cleanup: shouldn't be polluting the exports!
export const BODY_GENERATION_RADIUS = 55;

const ROCK_TINY_MASS = 0.5;
const ROCK_SMALL_MASS = 0.75;
const ROCK_MEDIUM_MASS = 1.15;
const ROCK_LARGE_MASS = 1.75;
const ROCK_MASSIVE_MASS = 2.25;

export const GOLEM_WAKE_TIME_TICKS = Math.floor(2.5 * Settings.TPS);

registerEntityLootOnDeath(EntityType.golem, [
   {
      itemType: ItemType.living_rock,
      getAmount: () => randInt(10, 20)
   }
]);

const hitboxIsTooClose = (existingHitboxes: ReadonlyArray<Hitbox>, hitboxX: number, hitboxY: number): boolean => {
   for (let j = 0; j < existingHitboxes.length; j++) {
      const otherHitbox = existingHitboxes[j];
      const otherBox = otherHitbox.box;

      const dist = distance(hitboxX, hitboxY, otherBox.offset.x, otherBox.offset.y);
      if (dist <= (otherBox as CircularBox).radius + 1) {
         return true;
      }
   }

   return false;
}

const getMinSeparationFromOtherHitboxes = (hitboxes: ReadonlyArray<Hitbox>, hitboxX: number, hitboxY: number, hitboxRadius: number): number => {
   let minSeparation = 999.9;
   for (let i = 0; i < hitboxes.length; i++) {
      const otherHitbox = hitboxes[i].box as CircularBox;

      const dist = distance(hitboxX, hitboxY, otherHitbox.offset.x, otherHitbox.offset.y);
      const separation = dist - otherHitbox.radius - hitboxRadius;
      if (separation < minSeparation) {
         minSeparation = separation;
      }
   }
   return minSeparation;
}

export function createGolemConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   // Create core hitbox
   const coreHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 36), ROCK_MASSIVE_MASS, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, coreHitbox);

   // Create head hitbox
   addHitboxToTransformComponent(transformComponent, createHitbox(transformComponent, coreHitbox, new CircularBox(new Point(0, 0), new Point(0, 45), 0, 32), ROCK_LARGE_MASS, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []));
   
   // Create body hitboxes
   let i = 0;
   let attempts = 0;
   while (i < 8 && ++attempts < 100) {
      const offsetMagnitude = BODY_GENERATION_RADIUS * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = offsetMagnitude * Math.sin(offsetDirection);
      const y = offsetMagnitude * Math.cos(offsetDirection);

      const size = Math.random() < 0.4 ? 0 : 1;
      const radius = size === 0 ? 20 : 26;

      // Make sure the hitboxes aren't too close
      if (hitboxIsTooClose(transformComponent.children as Array<Hitbox>, x, y)) {
         continue;
      }

      // Make sure the hitbox touches another one at least a small amount
      const minSeparation = getMinSeparationFromOtherHitboxes(transformComponent.children as Array<Hitbox>, x, y, radius);
      if (minSeparation > -6) {
         continue;
      }

      const mass = size === 0 ? ROCK_SMALL_MASS : ROCK_MEDIUM_MASS;
      const hitbox = createHitbox(transformComponent, coreHitbox, new CircularBox(new Point(0, 0), new Point(x, y), 0, radius), mass, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
      addHitboxToTransformComponent(transformComponent, hitbox);

      i++;
   }

   // Create hand hitboxes
   for (let j = 0; j < 2; j++) {
      const offsetX = 60 * (j === 0 ? -1 : 1);
      const hitbox = createHitbox(transformComponent, coreHitbox, new CircularBox(new Point(0, 0), new Point(offsetX, 50), 0, 20), ROCK_MEDIUM_MASS, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
      addHitboxToTransformComponent(transformComponent, hitbox);

      // Wrist
      const inFactor = 0.75;
      const wristHitbox = createHitbox(transformComponent, coreHitbox, new CircularBox(new Point(0, 0), new Point(offsetX * inFactor, 50 * inFactor), 0, 12), ROCK_TINY_MASS, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
      addHitboxToTransformComponent(transformComponent, wristHitbox);
   }
   
   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(150);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning | StatusEffect.poisoned);
   
   const golemComponent = new GolemComponent(transformComponent.children, GolemVars.PEBBLUM_SUMMON_COOLDOWN_TICKS);
   
   return createEntityConfig(
      EntityType.golem,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.golem]: golemComponent
      },
      []
   );
}