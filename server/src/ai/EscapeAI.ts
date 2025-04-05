import { Entity } from "battletribes-shared/entities";
import { AttackingEntitiesComponentArray } from "../components/AttackingEntitiesComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { AIHelperComponentArray } from "../components/AIHelperComponent";
import { Hitbox } from "../hitboxes";

export class EscapeAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;

   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
}

export function shouldRunEscapeAI(entity: Entity): boolean {
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(entity);
   return attackingEntitiesComponent.attackingEntities.size > 0;
}

export function getEscapeTarget(entity: Entity): Entity | null {
   const transformComponent = TransformComponentArray.getComponent(entity);
   // @Hack
   const entityHitbox = transformComponent.children[0] as Hitbox;
   
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
      const attackingEntityHitbox = attackingEntityTransformComponent.children[0] as Hitbox;
      
      const distance = entityHitbox.box.position.calculateDistanceBetween(attackingEntityHitbox.box.position);
      if (distance < minDistance) {
         minDistance = distance;
         escapeEntity = attackingEntity;
      }
   }

   return escapeEntity;
}

export function runEscapeAI(entity: Entity, escapeTarget: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
   const escapeAI = aiHelperComponent.getEscapeAI();

   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   
   const escapeTargetTransformComponent = TransformComponentArray.getComponent(escapeTarget);
   const escapeTargetHitbox = escapeTargetTransformComponent.children[0] as Hitbox;

   const targetX = hitbox.box.position.x * 2 - escapeTargetHitbox.box.position.x;
   const targetY = hitbox.box.position.y * 2 - escapeTargetHitbox.box.position.y;

   aiHelperComponent.move(entity, escapeAI.acceleration, escapeAI.turnSpeed, targetX, targetY);
}