import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { AttackingEntitiesComponentArray } from "./AttackingEntitiesComponent";
import { TransformComponentArray } from "./TransformComponent";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { applyAcceleration, setHitboxIdealAngle } from "../hitboxes";

export class EscapeAIComponent {
   public readonly acceleration: number;
   public readonly turnSpeed: number;

   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
}

export const EscapeAIComponentArray = new ComponentArray<EscapeAIComponent>(ServerComponentType.escapeAI, true, getDataLength, addDataToPacket);

export function shouldRunEscapeAI(entity: Entity): boolean {
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(entity);
   return attackingEntitiesComponent.attackingEntities.size > 0;
}

export function getEscapeTarget(entity: Entity): Entity | null {
   const transformComponent = TransformComponentArray.getComponent(entity);
   // @Hack
   const entityHitbox = transformComponent.hitboxes[0];
   
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(entity);
   const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
   
   let minDistance = Number.MAX_SAFE_INTEGER;
   let escapeEntity: Entity | null = null;
   for (const pair of attackingEntitiesComponent.attackingEntities) {
      const attackingEntity = pair[0];

      // Don't escape from entities which aren't visible
      if (!aiHelperComponent.visibleEntities.includes(attackingEntity)) {
         continue;
      }
      
      const attackingEntityTransformComponent = TransformComponentArray.getComponent(attackingEntity);
      // @Hack
      const attackingEntityHitbox = attackingEntityTransformComponent.hitboxes[0];
      
      const distance = entityHitbox.box.position.calculateDistanceBetween(attackingEntityHitbox.box.position);
      if (distance < minDistance) {
         minDistance = distance;
         escapeEntity = attackingEntity;
      }
   }

   return escapeEntity;
}

export function runEscapeAI(entity: Entity, escapeTarget: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = transformComponent.hitboxes[0];

   const escapeAIComponent = EscapeAIComponentArray.getComponent(entity);

   const escapeTargetTransformComponent = TransformComponentArray.getComponent(escapeTarget);
   const escapeTargetHitbox = escapeTargetTransformComponent.hitboxes[0];

   const direction = escapeTargetHitbox.box.position.calculateAngleBetween(entityHitbox.box.position);

   const accelerationX = escapeAIComponent.acceleration * Math.sin(direction);
   const accelerationY = escapeAIComponent.acceleration * Math.cos(direction);
   applyAcceleration(entity, entityHitbox, accelerationX, accelerationY);

   setHitboxIdealAngle(entityHitbox, direction, escapeAIComponent.turnSpeed);
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}