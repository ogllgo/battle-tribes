import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { polarVec2 } from "../../../shared/src/utils";
import { applyAccelerationFromGround } from "../hitboxes";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { TribeMemberComponentArray } from "./TribeMemberComponent";

export class InguYetuksnoglurblidokfleaComponent {}

export const InguYetuksnoglurblidokfleaComponentArray = new ComponentArray<InguYetuksnoglurblidokfleaComponent>(ServerComponentType.inguYetuksnoglurblidokflea, true, getDataLength, addDataToPacket);
InguYetuksnoglurblidokfleaComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

const isTarget = (entity: Entity): boolean => {
   return TribeMemberComponentArray.hasComponent(entity);
}

const getTarget = (inguYetu: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(inguYetu);
   const hitbox = transformComponent.hitboxes[0];
   
   let target: Entity | null = null;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!isTarget(entity)) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const targetHitbox = entityTransformComponent.hitboxes[0];
      const dist = hitbox.box.position.calculateDistanceBetween(targetHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

function onTick(inguYetu: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(inguYetu);
   
   const target = getTarget(inguYetu, aiHelperComponent);
   if (target === null) {
      return;
   }

   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.hitboxes[0];

   const transformComponent = TransformComponentArray.getComponent(inguYetu);
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_1) || hitbox.flags.includes(HitboxFlag.YETUK_BODY_2) || hitbox.flags.includes(HitboxFlag.YETUK_BODY_3) || hitbox.flags.includes(HitboxFlag.YETUK_BODY_4)) {
         aiHelperComponent.moveFunc(inguYetu, targetHitbox.box.position, 650);
         aiHelperComponent.turnFunc(inguYetu, targetHitbox.box.position, Math.PI, 1.5);
      }
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}