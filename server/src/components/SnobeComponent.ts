import { Entity, EntityType } from "../../../shared/src/entities";
import { runEscapeAI } from "../ai/EscapeAI";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { entityExists, getEntityLayer, getEntityType } from "../world";
import { entityChildIsHitbox, TransformComponent, TransformComponentArray } from "./TransformComponent";
import { addHitboxAngularVelocity, getHitboxTile, Hitbox } from "../hitboxes";
import { TileType } from "../../../shared/src/tiles";
import { Settings } from "../../../shared/src/settings";
import { getAbsAngleDiff, randFloat, randInt, randSign } from "../../../shared/src/utils";
import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { SNOBE_EAR_IDEAL_ANGLE } from "../entities/tundra/snobe";
import { updateFollowAIComponent, entityWantsToFollow, followAISetFollowTarget, continueFollowingEntity } from "../ai/FollowAI";

const MIN_EAR_WIGGLE_COOLDOWN_TICKS = 1.5 * Settings.TPS;
const MAX_EAR_WIGGLE_COOLDOWN_TICKS = 5.5 * Settings.TPS;

export class SnobeComponent {
   public earWiggleCooldowns = [randInt(MIN_EAR_WIGGLE_COOLDOWN_TICKS, MAX_EAR_WIGGLE_COOLDOWN_TICKS), randInt(MIN_EAR_WIGGLE_COOLDOWN_TICKS, MAX_EAR_WIGGLE_COOLDOWN_TICKS)];
}

export const SnobeComponentArray = new ComponentArray<SnobeComponent>(ServerComponentType.snobe, true, getDataLength, addDataToPacket);
SnobeComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
}

const entityIsFollowable = (entity: Entity): boolean => {
   return getEntityType(entity) === EntityType.player;
}

const getEarHitbox = (transformComponent: TransformComponent, i: number): Hitbox => {
   let currI = 0;
   for (const hitbox of transformComponent.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      if (hitbox.flags.includes(HitboxFlag.SNOBE_EAR) && currI++ === i) {
         return hitbox;
      }
   }

   throw new Error();
}

function onTick(snobe: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(snobe);
   const hitbox = transformComponent.children[0] as Hitbox;

   const layer = getEntityLayer(snobe);

   const tileIndex = getHitboxTile(hitbox);
   const tileType = layer.getTileType(tileIndex);

   // Snobes move at normal speed on snow
   const physicsComponent = PhysicsComponentArray.getComponent(snobe);
   physicsComponent.overrideMoveSpeedMultiplier = tileType === TileType.snow;

   const aiHelperComponent = AIHelperComponentArray.getComponent(snobe);

   const escapeAI = aiHelperComponent.getEscapeAI();
   if (runEscapeAI(snobe, aiHelperComponent, escapeAI)) {
      return;
   }

   // For wander AI and follow AI and standing still, wiggle ears on occasion
   const snobeComponent = SnobeComponentArray.getComponent(snobe);
   for (let i = 0; i < 2; i++) {
      const earHitbox = getEarHitbox(transformComponent, i);

      const earWiggleCooldown = snobeComponent.earWiggleCooldowns[i];
      if (earWiggleCooldown <= 0) {
         addHitboxAngularVelocity(earHitbox, randFloat(1.35 * Math.PI, 1.75 * Math.PI) * randSign());
         
         snobeComponent.earWiggleCooldowns[i] = randInt(MIN_EAR_WIGGLE_COOLDOWN_TICKS, MAX_EAR_WIGGLE_COOLDOWN_TICKS);
      } else if (getAbsAngleDiff(earHitbox.box.relativeAngle, SNOBE_EAR_IDEAL_ANGLE) < 0.08) {
         snobeComponent.earWiggleCooldowns[i]--;
      }
   }

   // @COPYNPASTE
   // Follow AI: Make the krumblid like to hide in cacti
   const followAI = aiHelperComponent.getFollowAI();
   updateFollowAIComponent(followAI, aiHelperComponent.visibleEntities, 5);

   const followedEntity = followAI.followTargetID;
   if (entityExists(followedEntity)) {
      continueFollowingEntity(snobe, followAI, followedEntity, 1000, 8 * Math.PI, 0.5);
      return;
   } else if (entityWantsToFollow(followAI)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entityIsFollowable(entity)) {
            // Follow the entity
            followAISetFollowTarget(followAI, entity, true);
            // @Incomplete: movement isn't accounted for!
            return;
         }
      }
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(snobe);
   if (wanderAI.targetPosition !== null) {
      aiHelperComponent.moveFunc(snobe, wanderAI.targetPosition, wanderAI.acceleration);
      aiHelperComponent.turnFunc(snobe, wanderAI.targetPosition, wanderAI.turnSpeed, wanderAI.turnDamping);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}