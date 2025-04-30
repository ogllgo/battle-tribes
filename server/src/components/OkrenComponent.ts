import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { getAbsAngleDiff, Point } from "../../../shared/src/utils";
import { getOkrenPreyTarget, getOkrenThreatTarget, runOkrenCombatAI } from "../ai/OkrenCombatAI";
import { applyAbsoluteKnockback, getHitboxVelocity, Hitbox, turnHitboxToAngle } from "../hitboxes";
import { getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, hitEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { getEntityFullness } from "./HungerComponent";
import { entityChildIsEntity, entityChildIsHitbox, TransformComponentArray } from "./TransformComponent";

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

const KRUMBLID_PEACE_TIME_TICKS = 5 * Settings.TPS;

export class OkrenComponent {
   public size = OkrenAgeStage.juvenile;
   
   public swingStates = [OkrenSwingState.resting, OkrenSwingState.resting];
   public ticksInStates = [0, 0];
   public currentSwingSide = OkrenSide.right;

   public remainingPeaceTimeTicks = 0;
}

export const OkrenComponentArray = new ComponentArray<OkrenComponent>(ServerComponentType.okren, true, getDataLength, addDataToPacket);
OkrenComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
OkrenComponentArray.onHitboxCollision = onHitboxCollision;

const setOkrenHitboxIdealAngles = (okren: Entity, side: OkrenSide, idealAngles: OkrenHitboxIdealAngles, bigTurnSpeed: number, mediumTurnSpeed: number, smallTurnSpeed: number): void => {
   // @Hack
   bigTurnSpeed *= 3;
   mediumTurnSpeed *= 3;
   smallTurnSpeed *= 3;
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
         turnHitboxToAngle(hitbox, idealAngles.bigIdealAngle, bigTurnSpeed, 0.28, true);
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT)) {
         turnHitboxToAngle(hitbox, idealAngles.mediumIdealAngle, mediumTurnSpeed, 0.24, true);
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
         turnHitboxToAngle(hitbox, idealAngles.smallIdealAngle, smallTurnSpeed, 0.2, true);
      }
   }
}

export function okrenHitboxesHaveReachedIdealAngles(okren: Entity, side: OkrenSide, idealAngles: OkrenHitboxIdealAngles): boolean {
   const EPSILON = 0.1;

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

const hasFleas = (okren: Entity): boolean => {
   const transformComponent = TransformComponentArray.getComponent(okren);

   for (const child of transformComponent.children) {
      if (entityChildIsEntity(child) && getEntityType(child.attachedEntity) === EntityType.dustflea) {
         return true;
      }
   }

   return false;
}

function onTick(okren: Entity): void {
   // @HACK: this should really be like some muscle or restriction thing defined when the okren is created.
   // Cuz what if this function gets disabled or when this gets abstracted into an AI component and the okren's AI gets turned off?
   for (const side of OKREN_SIDES) {
      const minAngle = -Math.PI * 0.4;
      const maxAngle = Math.PI * 0.2;

      const mandibleHitbox = getOkrenMandibleHitbox(okren, side);
      if (mandibleHitbox.box.relativeAngle < minAngle) {
         mandibleHitbox.box.relativeAngle = minAngle;
         mandibleHitbox.previousRelativeAngle = minAngle;
      } else if (mandibleHitbox.box.relativeAngle > maxAngle) {
         mandibleHitbox.box.relativeAngle = maxAngle;
         mandibleHitbox.previousRelativeAngle = maxAngle;
      }
   }
   
   const okrenComponent = OkrenComponentArray.getComponent(okren);

   if (okrenComponent.remainingPeaceTimeTicks > 0) {
      okrenComponent.remainingPeaceTimeTicks--;
   }
   
   okrenComponent.ticksInStates[0]++;
   okrenComponent.ticksInStates[1]++;

   for (const side of OKREN_SIDES) {
      switch (okrenComponent.swingStates[side]) {
         case OkrenSwingState.resting: {
            setOkrenHitboxIdealAngles(okren, side, restingIdealAngles, 1.2 * Math.PI, 3 * Math.PI, 3 * Math.PI);
            break;
         }
         case OkrenSwingState.poising: {
            setOkrenHitboxIdealAngles(okren, side, poisedIdealAngles, 2.1 * Math.PI, 2.4 * Math.PI, 2.4 * Math.PI);
            break;
         }
         case OkrenSwingState.raising: {
            setOkrenHitboxIdealAngles(okren, side, raisedIdealAngles, 3.6 * Math.PI, 4.5 * Math.PI, 6.75 * Math.PI);
            break;
         }
         case OkrenSwingState.swinging: {
            setOkrenHitboxIdealAngles(okren, side, swungIdealAngles, 2.4 * Math.PI, 3 * Math.PI, 1.5 * Math.PI);
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
         okrenComponent.ticksInStates[side] = 0;
      }  else if (okrenComponent.swingStates[side] === OkrenSwingState.raising && okrenHitboxesHaveReachedIdealAngles(okren, side, raisedIdealAngles)) {
         okrenComponent.swingStates[side] = OkrenSwingState.swinging;
         okrenComponent.ticksInStates[side] = 0;
      } else if (okrenComponent.swingStates[side] === OkrenSwingState.swinging && okrenHitboxesHaveReachedIdealAngles(okren, side, swungIdealAngles)) {
         okrenComponent.swingStates[side] = OkrenSwingState.resting;
         okrenComponent.ticksInStates[side] = 0;
      }
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(okren);

   const combatAI = aiHelperComponent.getOkrenCombatAI();
   
   // @Temporary until i'm done testing okren krumblid dynamics
   // const threatTarget = getOkrenThreatTarget(okren, aiHelperComponent);
   // if (threatTarget !== null) {
   //    runOkrenCombatAI(okren, aiHelperComponent, combatAI, threatTarget);
   //    return;
   // }

   if (getEntityFullness(okren) < 0.5) {
      const preyTarget = getOkrenPreyTarget(okren, aiHelperComponent);
      if (preyTarget !== null) {
         if (hasFleas(okren)) {
            okrenComponent.remainingPeaceTimeTicks = KRUMBLID_PEACE_TIME_TICKS;
         } else if (okrenComponent.remainingPeaceTimeTicks === 0) {
            runOkrenCombatAI(okren, aiHelperComponent, combatAI, preyTarget);
         }
         return;
      }
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
   // @Hack: mandible attacking
   // @Temporary
   // if (affectedHitbox.flags.includes(HitboxFlag.OKREN_MANDIBLE)) {
   //    if (!HealthComponentArray.hasComponent(collidingEntity)) {
   //       return;
   //    }
   //    const hash = "okrenmandible_" + okren + "_" + affectedHitbox.localID;
   //    const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   //    if (!canDamageEntity(healthComponent, hash)) {
   //       return;
   //    }
   //    hitEntity(collidingEntity, okren, 1, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   //    addLocalInvulnerabilityHash(collidingEntity, hash, 0.3);
   //    return;
   // }
   
   if (!affectedHitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
      return;
   }

   // @Hack: should be able to hit other okrens' tongues
   if (getEntityType(collidingEntity) === EntityType.okrenTongue || getEntityType(collidingEntity) === EntityType.okrenTongueTip || getEntityType(collidingEntity) === EntityType.okrenTongueSegment) {
      return;
   }

   const velocityDiff = getHitboxVelocity(affectedHitbox).calculateDistanceBetween(getHitboxVelocity(collidingHitbox));
   if (velocityDiff < 100) {
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