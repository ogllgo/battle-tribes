import { Entity, EntityType } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { angle, randFloat } from "../../../shared/src/utils";
import { getDistanceFromPointToEntity } from "../ai-shared";
import { AIHelperComponent, AIType } from "../components/AIHelperComponent";
import { getOkrenMandibleHitbox, OKREN_SIDES, OkrenComponentArray, okrenHitboxesHaveReachedIdealAngles, OkrenHitboxIdealAngles, OkrenSide, OkrenSwingState, restingIdealAngles, setOkrenHitboxIdealAngles } from "../components/OkrenComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { TribeMemberComponentArray } from "../components/TribeMemberComponent"
import { Hitbox, setHitboxIdealAngle } from "../hitboxes";
import { entityExists, getEntityType } from "../world";

export class OkrenCombatAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;

   public target: Entity = 0;

   public swingCooldownTicks = 0;

   public readonly okrenMandibleFlickCountdowns = [0, 0];
   public readonly okrenMandibleIsIns = [false, false];

   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
}

const SWING_COOLDOWN_TICKS = Settings.TPS;

const entityIsThreatToDesert = (entity: Entity): boolean => {
   return TribeMemberComponentArray.hasComponent(entity) || getEntityType(entity) === EntityType.zombie;
}

const getAttackTarget = (okren: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(okren);
   const hitbox = transformComponent.children[0] as Hitbox;

   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!entityIsThreatToDesert(entity)) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.children[0] as Hitbox;

      const dist = hitbox.box.position.calculateDistanceBetween(entityHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

export function updateOkrenCombatAI(okren: Entity, aiHelperComponent: AIHelperComponent, combatAI: OkrenCombatAI): void {
   const target = getAttackTarget(okren, aiHelperComponent);
   combatAI.target = target !== null ? target : 0;
}

export function shouldRunOkrenCombatAI(combatAI: OkrenCombatAI): boolean {
   return entityExists(combatAI.target);
}

export function runOkrenCombatAI(okren: Entity, aiHelperComponent: AIHelperComponent, combatAI: OkrenCombatAI): void {
   aiHelperComponent.currentAIType = AIType.krumblidCombat;
   
   const okrenComponent = OkrenComponentArray.getComponent(okren);
      
   const target = combatAI.target;
   
   const transformComponent = TransformComponentArray.getComponent(okren);
   const hitbox = transformComponent.children[0] as Hitbox;
   
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.children[0] as Hitbox;
   
   // @Incomplete: move using pathfinding!!!
   aiHelperComponent.move(okren, combatAI.acceleration, combatAI.turnSpeed, targetHitbox.box.position.x, targetHitbox.box.position.y);

   // @Hack: override the ideal angle
   // Make the okren lean into the swings
   for (const side of OKREN_SIDES) {
      if (okrenComponent.swingStates[side] === OkrenSwingState.swinging) {
         const angleToTarget = hitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
         const idealAngle = angleToTarget + (side === OkrenSide.right ? -0.3 : 0.3);
         setHitboxIdealAngle(hitbox, idealAngle, combatAI.turnSpeed, false);
      }
   }

   const distanceToTarget = getDistanceFromPointToEntity(hitbox.box.position, targetTransformComponent);
   const isInAttackRange = distanceToTarget <= 250;

   if (isInAttackRange) {
      if (--combatAI.swingCooldownTicks <= 0) {
         combatAI.swingCooldownTicks = 0;
         for (const side of OKREN_SIDES) {
            if (okrenComponent.swingStates[side] === OkrenSwingState.resting && okrenHitboxesHaveReachedIdealAngles(okren, okrenComponent.currentSwingSide, restingIdealAngles)) {
               okrenComponent.swingStates[side] = OkrenSwingState.poising;
               okrenComponent.currentSwingSide = okrenComponent.currentSwingSide === OkrenSide.right ? OkrenSide.left : OkrenSide.right;
               combatAI.swingCooldownTicks = SWING_COOLDOWN_TICKS;
               break;
            }
         }
      }
   }

   // Mandible wiggling
   for (const side of OKREN_SIDES) {
      combatAI.okrenMandibleFlickCountdowns[side]--;
      if (combatAI.okrenMandibleFlickCountdowns[side] <= 0) {
         combatAI.okrenMandibleFlickCountdowns[side] = Math.floor(randFloat(0.08, 0.2) * Settings.TPS);
         combatAI.okrenMandibleIsIns[side] = !combatAI.okrenMandibleIsIns[side];
      }

      const mandibleHitbox = getOkrenMandibleHitbox(okren, side);
      const idealAngle = combatAI.okrenMandibleIsIns[side] ? -Math.PI * 0.3 : Math.PI * 0.1;
      setHitboxIdealAngle(mandibleHitbox, idealAngle, 3 * Math.PI, true);
   }
}