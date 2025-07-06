import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Hitbox } from "../hitboxes";
import { getEntityType } from "../world";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export class WraithComponent {}

export const WraithComponentArray = new ComponentArray<WraithComponent>(ServerComponentType.wraith, true, getDataLength, addDataToPacket);
WraithComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

const isTarget = (entity: Entity): boolean => {
   const entityType = getEntityType(entity);
   // @HACK @INCOMPLETE
   return entityType === EntityType.player || entityType === EntityType.snobe
}

const getTarget = (wraith: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(wraith);
   const hitbox = transformComponent.children[0] as Hitbox;
   
   let target: Entity | null = null;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!isTarget(entity)) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const targetHitbox = entityTransformComponent.children[0] as Hitbox;
      const dist = hitbox.box.position.calculateDistanceBetween(targetHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

function onTick(wraith: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(wraith);

   const target = getTarget(wraith, aiHelperComponent);
   if (target !== null) {
      const targetTransformComponent = TransformComponentArray.getComponent(target);
      const targetHitbox = targetTransformComponent.children[0] as Hitbox;
      
      aiHelperComponent.moveFunc(wraith, targetHitbox.box.position, 1000);
      aiHelperComponent.turnFunc(wraith, targetHitbox.box.position, 8 * Math.PI, 0.7);
      return;
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}