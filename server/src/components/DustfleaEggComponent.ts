import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { Point, randFloat, randInt, randSign } from "../../../shared/src/utils";
import { createDustfleaConfig } from "../entities/desert/dustflea";
import { createEntity } from "../Entity";
import { addHitboxAngularVelocity, Hitbox } from "../hitboxes";
import { tetherHitboxes } from "../tethers";
import { destroyEntity, getEntityAgeTicks, getEntityLayer, getEntityType, ticksToGameHours } from "../world";
import { ComponentArray } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";

// @Incomplete: make dustflea eggs stick to walls as well

const MIN_JIGGLE_TIME_TICKS = 2 * Settings.TPS;
const MAX_JIGGLE_TIME_TICKS = 3 * Settings.TPS;

export class DustfleaEggComponent {
   public readonly parentOkren: Entity;
   public jiggleTimer = randInt(MIN_JIGGLE_TIME_TICKS, MAX_JIGGLE_TIME_TICKS);

   constructor(parentOkren: Entity) {
      this.parentOkren = parentOkren;
   }
}

export const DustfleaEggComponentArray = new ComponentArray<DustfleaEggComponent>(ServerComponentType.dustfleaEgg, true, getDataLength, addDataToPacket);
DustfleaEggComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
DustfleaEggComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(dustfleaEgg: Entity): void {
   const dustfleaEggComponent = DustfleaEggComponentArray.getComponent(dustfleaEgg);
   if (dustfleaEggComponent.jiggleTimer > 0) {
      dustfleaEggComponent.jiggleTimer--;
   } else {
      dustfleaEggComponent.jiggleTimer = randInt(MIN_JIGGLE_TIME_TICKS, MAX_JIGGLE_TIME_TICKS);

      const transformComponent = TransformComponentArray.getComponent(dustfleaEgg);
      const hitbox = transformComponent.children[0] as Hitbox;
      addHitboxAngularVelocity(hitbox, randFloat(0.4, 0.7) * randSign());
   }

   const ageHours = ticksToGameHours(getEntityAgeTicks(dustfleaEgg));
   if (ageHours >= 4) {
      // Dustflea!!
      const transformComponent = TransformComponentArray.getComponent(dustfleaEgg);
      const hitbox = transformComponent.children[0] as Hitbox;
      const dustfleaConfig = createDustfleaConfig(hitbox.box.position.copy(), hitbox.box.angle);
      createEntity(dustfleaConfig, getEntityLayer(dustfleaEgg), 0);
      destroyEntity(dustfleaEgg);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(dustfleaEgg: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   // Can't stick to dustfleas
   if (getEntityType(collidingEntity) === EntityType.dustflea) {
      return;
   }
   
   // @Hack: so that the eggs don't immediately stick to the okren when they come out
   if (getEntityType(collidingEntity) === EntityType.okren || getEntityType(collidingEntity) === EntityType.okrenClaw) {
      return;
   }

   // Make sure neither of the hitboxes are already tethered to either of each other
   for (const tether of affectedHitbox.tethers) {
      const otherHitbox = tether.getOtherHitbox(affectedHitbox);
      if (otherHitbox === collidingHitbox) {
         return;
      }
   }
   // @Copynpaste @Hack: ideally we shouldn't have to check both hitboxes for the tether. references should be present on both not just 1
   for (const tether of collidingHitbox.tethers) {
      const otherHitbox = tether.getOtherHitbox(collidingHitbox)
      if (otherHitbox === affectedHitbox) {
         return;
      }
   }

   // @Cleanup: this sucks. tethers shouldn't know about transform components (?)
   const transformComponent1 = TransformComponentArray.getComponent(dustfleaEgg);
   const transformComponent2 = TransformComponentArray.getComponent(collidingEntity);
   tetherHitboxes(affectedHitbox, collidingHitbox, transformComponent1, transformComponent2, 20, 10, 1);
}