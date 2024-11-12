import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { moveEntityToEntity, stopEntity } from "../ai-shared";
import { CollisionVars, entitiesAreColliding } from "../collision";
import { destroyEntity, getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { PhysicsComponentArray } from "./PhysicsComponent";

export class GlurbComponent {}

export const GlurbComponentArray = new ComponentArray<GlurbComponent>(ServerComponentType.glurb, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket,
   onTick: {
      func: onTick,
      tickInterval: 1
   }
});

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

function onTick(glurb: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(glurb);

   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) === EntityType.itemEntity) {
         moveEntityToEntity(glurb, entity, 350, Math.PI * 1);

         if (entitiesAreColliding(glurb, entity) !== CollisionVars.NO_COLLISION) {
            destroyEntity(entity);
         }
         
         return;
      }
   }

   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) === EntityType.player) {
         moveEntityToEntity(glurb, entity, 350, Math.PI * 1);
         
         return;
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(glurb);
   stopEntity(physicsComponent);
}