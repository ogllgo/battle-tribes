import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import { randFloat, randInt } from "battletribes-shared/utils";
import { playSoundOnEntity } from "./sound";
import { ItemType } from "battletribes-shared/items/items";
import { entityExists } from "./world";
import { Entity } from "../../shared/src/entities";
import { getRandomPositionOnBoxEdge, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { createHotSparkParticle } from "./particles";

export function playBowFireSound(sourceEntity: Entity, bowItemType: ItemType): void {
   switch (bowItemType) {
      case ItemType.wooden_bow: {
         playSoundOnEntity("bow-fire.mp3", 0.4, 1, sourceEntity, false);
         break;
      }
      case ItemType.reinforced_bow: {
         playSoundOnEntity("reinforced-bow-fire.mp3", 0.2, 1, sourceEntity, false);
         break;
      }
      case ItemType.ice_bow: {
         playSoundOnEntity("ice-bow-fire.mp3", 0.4, 1, sourceEntity, false);
         break;
      }
   }
}

const processTickEvent = (entity: Entity, tickEvent: EntityTickEvent): void => {
   switch (tickEvent.type) {
      case EntityTickEventType.cowFart: {
         playSoundOnEntity("fart.mp3", 0.3, randFloat(0.9, 1.2), entity, false);
         break;
      }
      case EntityTickEventType.fireBow: {
         // @Cleanup: why need cast?
         playBowFireSound(entity, tickEvent.data as ItemType);
         break;
      }
      case EntityTickEventType.automatonAccident: {
         playSoundOnEntity("automaton-accident-" + randInt(1, 2) + ".mp3", 0.3, randFloat(0.9, 1.2), entity, false);

         // Make sparks fly off
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];
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