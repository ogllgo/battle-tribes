import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import { randFloat } from "battletribes-shared/utils";
import { playSoundOnEntity } from "./sound";
import { ItemType } from "battletribes-shared/items/items";
import { entityExists } from "./world";
import { Entity } from "../../shared/src/entities";

export function playBowFireSound(sourceEntity: Entity, bowItemType: ItemType): void {
   switch (bowItemType) {
      case ItemType.wooden_bow: {
         playSoundOnEntity("bow-fire.mp3", 0.4, 1, sourceEntity);
         break;
      }
      case ItemType.reinforced_bow: {
         playSoundOnEntity("reinforced-bow-fire.mp3", 0.2, 1, sourceEntity);
         break;
      }
      case ItemType.ice_bow: {
         playSoundOnEntity("ice-bow-fire.mp3", 0.4, 1, sourceEntity);
         break;
      }
   }
}

const processTickEvent = (entity: Entity, tickEvent: EntityTickEvent): void => {
   switch (tickEvent.type) {
      case EntityTickEventType.cowFart: {
         playSoundOnEntity("fart.mp3", 0.3, randFloat(0.9, 1.2), entity);
         break;
      }
      case EntityTickEventType.fireBow: {
         // @Cleanup: why need cast?
         playBowFireSound(entity, tickEvent.data as ItemType);
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