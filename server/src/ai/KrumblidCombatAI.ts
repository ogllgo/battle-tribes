import { assertBoxIsCircular } from "../../../shared/src/boxes/boxes";
import { Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Settings } from "../../../shared/src/settings";
import { Point } from "../../../shared/src/utils";
import { entitiesAreColliding, CollisionVars } from "../collision-detection";
import { AIHelperComponent, AIType } from "../components/AIHelperComponent";
import { EnergyStoreComponentArray } from "../components/EnergyStoreComponent";
import { hitEntity, HealthComponentArray } from "../components/HealthComponent";
import { addHungerEnergy } from "../components/HungerComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { Hitbox, turnHitboxToAngle } from "../hitboxes";
import { getEntityType, entityExists, getEntityAgeTicks } from "../world";

export class KrumblidCombatAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;

   public target: Entity = 0;

   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
}

const wantsToAttackEntity = (entity: Entity): boolean => {
   return getEntityType(entity) === EntityType.dustflea;
}

const getAttackTarget = (krumblid: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.children[0] as Hitbox;

   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!wantsToAttackEntity(entity)) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.children[0] as Hitbox;
      assertBoxIsCircular(entityHitbox.box);

      const dist = hitbox.box.position.calculateDistanceBetween(entityHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

export function updateKrumblidCombatAI(krumblid: Entity, aiHelperComponent: AIHelperComponent, krumblidCombatAI: KrumblidCombatAI): void {
   const target = getAttackTarget(krumblid, aiHelperComponent);
   krumblidCombatAI.target = target !== null ? target : 0;
}

export function shouldRunKrumblidCombatAI(krumblidCombatAI: KrumblidCombatAI): boolean {
   return entityExists(krumblidCombatAI.target);
}

export function runKrumblidCombatAI(krumblid: Entity, aiHelperComponent: AIHelperComponent, krumblidCombatAI: KrumblidCombatAI): void {
   aiHelperComponent.currentAIType = AIType.krumblidCombat;
   
   const target = krumblidCombatAI.target;
   
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.children[0] as Hitbox;
   
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.children[0] as Hitbox;
   
   // @Incomplete: move using pathfinding!!!
   aiHelperComponent.move(krumblid, krumblidCombatAI.acceleration, krumblidCombatAI.turnSpeed, targetHitbox.box.position.x, targetHitbox.box.position.y);

   if (entitiesAreColliding(krumblid, target) !== CollisionVars.NO_COLLISION) {
      // @Copynpaste
      for (let i = 0; i < 2; i++) {
         // @Hack
         const mandibleHitbox = transformComponent.children[i + 1] as Hitbox;
         const idealAngle = ((getEntityAgeTicks(krumblid) * 3.2 + (i === 0 ? Settings.TPS * 0.35 : 0)) % Settings.TPS) / Settings.TPS < 0.5 ? -Math.PI * 0.3 : Math.PI * 0.1;
         turnHitboxToAngle(mandibleHitbox, idealAngle, 3 * Math.PI, 0.5, true);
      }

      if (getEntityAgeTicks(krumblid) % Settings.TPS === 0) {
         const hitPosition = new Point((targetHitbox.box.position.x + hitbox.box.position.x) / 2, (targetHitbox.box.position.y + hitbox.box.position.y) / 2);
         hitEntity(target, krumblid, 1, 0, AttackEffectiveness.effective, hitPosition, 0);
      }
   }
}