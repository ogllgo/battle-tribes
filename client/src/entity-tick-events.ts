import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import { randFloat, randInt } from "battletribes-shared/utils";
import { playSoundOnHitbox } from "./sound";
import { ItemType } from "battletribes-shared/items/items";
import { entityExists } from "./world";
import { Entity } from "../../shared/src/entities";
import { getRandomPositionOnBoxEdge, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { createHotSparkParticle } from "./particles";
import { Hitbox } from "./hitboxes";

export function playBowFireSound(sourceEntity: Entity, bowItemType: ItemType): void {
   // @Hack
   const transformComponent = TransformComponentArray.getComponent(sourceEntity);
   const hitbox = transformComponent.children[0] as Hitbox;

   switch (bowItemType) {
      case ItemType.wooden_bow: {
         playSoundOnHitbox("bow-fire.mp3", 0.4, 1, sourceEntity, hitbox, false);
         break;
      }
      case ItemType.reinforced_bow: {
         playSoundOnHitbox("reinforced-bow-fire.mp3", 0.2, 1, sourceEntity, hitbox, false);
         break;
      }
      case ItemType.ice_bow: {
         playSoundOnHitbox("ice-bow-fire.mp3", 0.4, 1, sourceEntity, hitbox, false);
         break;
      }
   }
}

const processTickEvent = (entity: Entity, tickEvent: EntityTickEvent): void => {
   // @Hack
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   switch (tickEvent.type) {
      case EntityTickEventType.cowFart: {
         playSoundOnHitbox("fart.mp3", 0.3, randFloat(0.9, 1.2), entity, hitbox, false);
         break;
      }
      case EntityTickEventType.fireBow: {
         // @Cleanup: why need cast?
         playBowFireSound(entity, tickEvent.data as ItemType);
         break;
      }
      case EntityTickEventType.automatonAccident: {
         playSoundOnHitbox("automaton-accident-" + randInt(1, 2) + ".mp3", 0.3, randFloat(0.9, 1.2), entity, hitbox, false);

         // Make sparks fly off
         const position = getRandomPositionOnBoxEdge(hitbox.box);

         for (let i = 0; i < 5; i++) {
            const spawnOffsetRange = 6;
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = position.x + spawnOffsetRange * Math.sin(spawnOffsetDirection);
            const spawnPositionY = position.y + spawnOffsetRange * Math.cos(spawnOffsetDirection);
            createHotSparkParticle(spawnPositionX, spawnPositionY);
         }

         break;
      }
      case EntityTickEventType.cowEat: {
         playSoundOnHitbox("cow-eat.mp3", 0.4, randFloat(0.9, 1.1), entity, hitbox, true);
         break;
      }
      case EntityTickEventType.dustfleaLatch: {
         playSoundOnHitbox("dustflea-latch.mp3", 0.4, randFloat(0.9, 1.1), entity, hitbox, true);
         break;
      }
      case EntityTickEventType.tongueGrab: {
         playSoundOnHitbox("tongue-grab.mp3", 0.8, 1, entity, hitbox, true);
         break;
      }
      case EntityTickEventType.tongueLaunch: {
         playSoundOnHitbox("okren-tongue-launch.mp3", 0.5, 1.2, entity, hitbox, true);
         break;
      }
      case EntityTickEventType.tongueLick: {
         playSoundOnHitbox("okren-tongue-lick.mp3", randFloat(0.3, 0.35), randFloat(0.9, 1.1), entity, hitbox, true);
         break;
      }
   }
}

export function processTickEvents(tickEvents: ReadonlyArray<EntityTickEvent>): void {
   for (let i = 0; i < tickEvents.length; i++) {
      const entityTickEvent = tickEvents[i];
      
      if (entityExists(entityTickEvent.entityID)) {
         processTickEvent(entityTickEvent.entityID, entityTickEvent);
      }
   }
}