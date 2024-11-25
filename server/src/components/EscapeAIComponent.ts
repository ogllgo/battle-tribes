import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { AttackingEntitiesComponentArray } from "./AttackingEntitiesComponent";
import { TransformComponentArray } from "./TransformComponent";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";

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
      const distance = transformComponent.position.calculateDistanceBetween(attackingEntityTransformComponent.position);
      if (distance < minDistance) {
         minDistance = distance;
         escapeEntity = attackingEntity;
      }
   }

   return escapeEntity;
}

export function runEscapeAI(entity: Entity, escapeTarget: Entity): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   const escapeAIComponent = EscapeAIComponentArray.getComponent(entity);
   const escapeTargetTransformComponent = TransformComponentArray.getComponent(escapeTarget);

   const direction = escapeTargetTransformComponent.position.calculateAngleBetween(transformComponent.position);

   physicsComponent.acceleration.x = escapeAIComponent.acceleration * Math.sin(direction);
   physicsComponent.acceleration.y = escapeAIComponent.acceleration * Math.cos(direction);
   physicsComponent.targetRotation = direction;
   physicsComponent.turnSpeed = escapeAIComponent.turnSpeed;
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}