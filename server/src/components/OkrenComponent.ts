import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { getAbsAngleDiff, Point } from "../../../shared/src/utils";
import { getOkrenPreyTarget, getOkrenThreatTarget, runOkrenCombatAI } from "../ai/OkrenCombatAI";
import { applyAbsoluteKnockback, Hitbox, turnHitboxToAngle } from "../hitboxes";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, hitEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { getEntityFullness } from "./HungerComponent";
import { entityChildIsHitbox, TransformComponentArray } from "./TransformComponent";

export const enum OkrenAgeStage {
   juvenile,
   youth,
   adult,
   elder,
   ancient
}

export const enum OkrenSide {
   right,
   left
}

export const enum OkrenSwingState {
   resting,
   /** Pulls the arm back a bit to build up more momentum for the swing */
   poising,
   raising,
   swinging,
   returning
}

export interface OkrenHitboxIdealAngles {
   readonly bigIdealAngle: number;
   readonly mediumIdealAngle: number;
   readonly smallIdealAngle: number;
}

export const OKREN_SIDES = [OkrenSide.right, OkrenSide.left];

// @Cleanup: shit name expoerted!
export const restingIdealAngles: OkrenHitboxIdealAngles = {
   bigIdealAngle: Math.PI * 0.25,
   mediumIdealAngle: -Math.PI * 0.4,
   smallIdealAngle: -Math.PI * 0.65
};
// @Cleanup: shit name expoerted!
export const poisedIdealAngles: OkrenHitboxIdealAngles = {
   bigIdealAngle: Math.PI * 0.35,
   mediumIdealAngle: -Math.PI * 0.35,
   smallIdealAngle: -Math.PI * 0.5
};
const raisedIdealAngles: OkrenHitboxIdealAngles = {
   bigIdealAngle: Math.PI * 0.15,
   mediumIdealAngle: -Math.PI * 0.05,
   smallIdealAngle: Math.PI * 0.05
};
const swungIdealAngles: OkrenHitboxIdealAngles = {
   bigIdealAngle: -Math.PI * 0.1,
   mediumIdealAngle: -Math.PI * 0.6,
   smallIdealAngle: -Math.PI * 0.3
};

export class OkrenComponent {
   public size = OkrenAgeStage.juvenile;
   
   public swingStates = [OkrenSwingState.resting, OkrenSwingState.resting];
   public currentSwingSide = OkrenSide.right;
}

export const OkrenComponentArray = new ComponentArray<OkrenComponent>(ServerComponentType.okren, true, getDataLength, addDataToPacket);
OkrenComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
OkrenComponentArray.onHitboxCollision = onHitboxCollision;

export function setOkrenHitboxIdealAngles(okren: Entity, side: OkrenSide, idealAngles: OkrenHitboxIdealAngles, bigTurnSpeed: number, mediumTurnSpeed: number, smallTurnSpeed: number): void {
   const transformComponent = TransformComponentArray.getComponent(okren);
   for (const hitbox of transformComponent.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      const isRightSide = hitbox.box.totalFlipXMultiplier === 1;
      if (isRightSide !== (side === OkrenSide.right)) {
         continue;
      }
      
      if (hitbox.flags.includes(HitboxFlag.OKREN_BIG_ARM_SEGMENT)) {
         turnHitboxToAngle(hitbox, idealAngles.bigIdealAngle, bigTurnSpeed, 1, true);
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT)) {
         turnHitboxToAngle(hitbox, idealAngles.mediumIdealAngle, mediumTurnSpeed, 1, true);
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
         turnHitboxToAngle(hitbox, idealAngles.smallIdealAngle, smallTurnSpeed, 1, true);
      }
   }
}

export function okrenHitboxesHaveReachedIdealAngles(okren: Entity, side: OkrenSide, idealAngles: OkrenHitboxIdealAngles): boolean {
   const EPSILON = 0.01;

   const transformComponent = TransformComponentArray.getComponent(okren);
   for (const hitbox of transformComponent.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      const isRightSide = hitbox.box.totalFlipXMultiplier === 1;
      if (isRightSide !== (side === OkrenSide.right)) {
         continue;
      }
      
      if (hitbox.flags.includes(HitboxFlag.OKREN_BIG_ARM_SEGMENT)) {
         if (getAbsAngleDiff(hitbox.box.relativeAngle, idealAngles.bigIdealAngle) > EPSILON) {
            return false;
         }
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT)) {
         if (getAbsAngleDiff(hitbox.box.relativeAngle, idealAngles.mediumIdealAngle) > EPSILON) {
            return false;
         }
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
         if (getAbsAngleDiff(hitbox.box.relativeAngle, idealAngles.smallIdealAngle) > EPSILON) {
            return false;
         }
      }
   }

   return true;
}

export function getOkrenMandibleHitbox(okren: Entity, side: OkrenSide): Hitbox {
   const transformComponent = TransformComponentArray.getComponent(okren);
   for (const hitbox of transformComponent.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      const isRightSide = hitbox.box.totalFlipXMultiplier === 1;
      if (isRightSide !== (side === OkrenSide.right)) {
         continue;
      }
      
      if (hitbox.flags.includes(HitboxFlag.OKREN_MANDIBLE)) {
         return hitbox;
      }
   }

   throw new Error();
}

function onTick(okren: Entity): void {
   const okrenComponent = OkrenComponentArray.getComponent(okren);

   for (const side of OKREN_SIDES) {
      switch (okrenComponent.swingStates[side]) {
         case OkrenSwingState.resting: {
            setOkrenHitboxIdealAngles(okren, side, restingIdealAngles, 0.4 * Math.PI, 1 * Math.PI, 1 * Math.PI);
            break;
         }
         case OkrenSwingState.poising: {
            setOkrenHitboxIdealAngles(okren, side, poisedIdealAngles, 0.7 * Math.PI, 0.8 * Math.PI, 0.8 * Math.PI);
            break;
         }
         case OkrenSwingState.raising: {
            setOkrenHitboxIdealAngles(okren, side, raisedIdealAngles, 0.8 * Math.PI * 1.5, 1 * Math.PI * 1.5, 1.5 * Math.PI * 1.5);
            break;
         }
         case OkrenSwingState.swinging: {
            setOkrenHitboxIdealAngles(okren, side, swungIdealAngles, 0.8 * Math.PI, 1 * Math.PI, 0.5 * Math.PI);
            break;
         }
         case OkrenSwingState.returning: {
            break;
         }
      }
   }
   
   for (const side of OKREN_SIDES) {
      if (okrenComponent.swingStates[side] === OkrenSwingState.poising && okrenHitboxesHaveReachedIdealAngles(okren, side, poisedIdealAngles)) {
         okrenComponent.swingStates[side] = OkrenSwingState.raising;
      }  else if (okrenComponent.swingStates[side] === OkrenSwingState.raising && okrenHitboxesHaveReachedIdealAngles(okren, side, raisedIdealAngles)) {
         okrenComponent.swingStates[side] = OkrenSwingState.swinging;
      } else if (okrenComponent.swingStates[side] === OkrenSwingState.swinging && okrenHitboxesHaveReachedIdealAngles(okren, side, swungIdealAngles)) {
         okrenComponent.swingStates[side] = OkrenSwingState.resting;
      }
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(okren);

   const combatAI = aiHelperComponent.getOkrenCombatAI();

   if (getEntityFullness(okren) < 0.5) {
      const target = getOkrenPreyTarget(okren, aiHelperComponent);
      if (target !== null) {
         runOkrenCombatAI(okren, aiHelperComponent, combatAI, target);
         return;
      }
   }
   
   const threatTarget = getOkrenThreatTarget(okren, aiHelperComponent);
   if (threatTarget !== null) {
      runOkrenCombatAI(okren, aiHelperComponent, combatAI, threatTarget);
      return;
   }
   
   // By default, move the krumblids' arms back to their resting position
   const idealAngles: OkrenHitboxIdealAngles = {
      bigIdealAngle: Math.PI * 0.2,
      mediumIdealAngle: -Math.PI * 0.8,
      smallIdealAngle: -Math.PI * 0.9
   };
   for (const side of OKREN_SIDES) {
      setOkrenHitboxIdealAngles(okren, side, idealAngles, 1 * Math.PI, 1 * Math.PI, 1 * Math.PI);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, okren: Entity): void {
   const okrenComponent = OkrenComponentArray.getComponent(okren);
   packet.addNumber(okrenComponent.size);
}

function onHitboxCollision(okren: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   if (!affectedHitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
      return;
   }
      
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const hash = "okren_" + okren + "_" + affectedHitbox.localID;
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, hash)) {
      return;
   }

   const hitDirection = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);

   hitEntity(collidingEntity, okren, 4, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingEntity, collidingHitbox, 200, hitDirection);
   addLocalInvulnerabilityHash(collidingEntity, hash, 0.3);
}