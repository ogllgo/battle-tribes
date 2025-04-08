import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { Point, randFloat, randInt } from "../../../shared/src/utils";
import { getDistanceFromPointToEntity } from "../ai-shared";
import { createEntityConfigAttachInfo } from "../components";
import { AIHelperComponent, AIType } from "../components/AIHelperComponent";
import { getOkrenMandibleHitbox, OKREN_SIDES, OkrenComponentArray, okrenHitboxesHaveReachedIdealAngles, OkrenHitboxIdealAngles, OkrenSide, OkrenSwingState, restingIdealAngles, setOkrenHitboxIdealAngles } from "../components/OkrenComponent";
import { OkrenTongueTipComponentArray } from "../components/OkrenTongueTipComponent";
import { attachEntity, entityChildIsEntity, removeAttachedEntity, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { TribeMemberComponentArray } from "../components/TribeMemberComponent"
import { createOkrenTongueSegmentConfig } from "../entities/desert/okren-tongue-segment";
import { createOkrenTongueTipConfig } from "../entities/desert/okren-tongue-tip";
import { createEntity } from "../Entity";
import { Hitbox, setHitboxIdealAngle } from "../hitboxes";
import { destroyEntity, entityExists, getEntityLayer, getEntityType } from "../world";

export class OkrenCombatAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;

   public swingCooldownTicks = 0;

   public readonly okrenMandibleFlickCountdowns = [0, 0];
   public readonly okrenMandibleIsIns = [false, false];

   public tongueCooldownTicks = randInt(MIN_TONGUE_COOLDOWN_TICKS, MAX_TONGUE_COOLDOWN_TICKS);
   public tongueIsRetracting = false;

   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
}

const SWING_COOLDOWN_TICKS = Settings.TPS;

const TONGUE_INITIAL_OFFSET = 88;
const MIN_TONGUE_COOLDOWN_TICKS = 2 * Settings.TPS;
const MAX_TONGUE_COOLDOWN_TICKS = 3 * Settings.TPS;

const entityIsThreatToDesert = (entity: Entity): boolean => {
   return TribeMemberComponentArray.hasComponent(entity) || getEntityType(entity) === EntityType.zombie;
}

const entityIsPrey = (entity: Entity): boolean => {
   const entityType = getEntityType(entity);
   return entityType === EntityType.krumblid;
}

const getAttackTarget = (okren: Entity, aiHelperComponent: AIHelperComponent, entityIsTargetted: (entity: Entity) => boolean): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(okren);
   const hitbox = transformComponent.children[0] as Hitbox;

   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!entityIsTargetted(entity)) {
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

export function getOkrenThreatTarget(okren: Entity, aiHelperComponent: AIHelperComponent): Entity | null {
   return getAttackTarget(okren, aiHelperComponent, entityIsThreatToDesert);
}

export function getOkrenPreyTarget(okren: Entity, aiHelperComponent: AIHelperComponent): Entity | null {
   return getAttackTarget(okren, aiHelperComponent, entityIsPrey);
}

const getTongueRootEntity = (transformComponent: TransformComponent): Entity | null => {
   for (const child of transformComponent.children) {
      if (entityChildIsEntity(child) && (getEntityType(child.attachedEntity) === EntityType.okrenTongueTip || getEntityType(child.attachedEntity) === EntityType.okrenTongueSegment)) {
         return child.attachedEntity;
      }
   }
   return null;
}

const getTonguePosition = (hitbox: Hitbox, offsetMagnitude: number): Point => {
   const offsetDirection = hitbox.box.angle;
   const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
   return new Point(x, y);
}

const deployTongue = (okren: Entity, hitbox: Hitbox): void => {
   const tongueConfig = createOkrenTongueTipConfig(getTonguePosition(hitbox, TONGUE_INITIAL_OFFSET), hitbox.box.angle);
   tongueConfig.attachInfo = createEntityConfigAttachInfo(okren, hitbox, true);
   createEntity(tongueConfig, getEntityLayer(okren), 0);
}

const advanceTongue = (okren: Entity, hitbox: Hitbox, tongueRootEntity: Entity): void => {
   const tongueRootTransformComponent = TransformComponentArray.getComponent(tongueRootEntity);
   const tongueRootHitbox = tongueRootTransformComponent.children[0] as Hitbox;

   tongueRootHitbox.box.offset.y += 500 / Settings.TPS;

   // new segmente!
   if (tongueRootHitbox.box.offset.y >= TONGUE_INITIAL_OFFSET + 24) {
      const offsetMagnitude = tongueRootHitbox.box.offset.y - 24;
      
      // Create the new root entity
      const segmentConfig = createOkrenTongueSegmentConfig(getTonguePosition(hitbox, offsetMagnitude), hitbox.box.angle);
      
      const segmentTransformComponent = segmentConfig.components[ServerComponentType.transform]!;
      segmentConfig.attachInfo = createEntityConfigAttachInfo(okren, hitbox, true);
      segmentConfig.childEntities = [
         {
            entity: tongueRootEntity,
            attachInfo: {
               attachedEntity: tongueRootEntity,
               parentHitbox: segmentTransformComponent.children[0] as Hitbox,
               destroyWhenParentIsDestroyed: true
            }
         }
      ]

      createEntity(segmentConfig, getEntityLayer(okren), 0);
   }
}

const regressTongue = (okren: Entity, hitbox: Hitbox, tongueRootEntity: Entity, combatAI: OkrenCombatAI): void => {
   const tongueRootTransformComponent = TransformComponentArray.getComponent(tongueRootEntity);
   const tongueRootHitbox = tongueRootTransformComponent.children[0] as Hitbox;

   let hasSnaggedSomething = false;
   if (getEntityType(tongueRootEntity) === EntityType.okrenTongueTip) {
      const okrenTongueTipComponent = OkrenTongueTipComponentArray.getComponent(tongueRootEntity);
      if (okrenTongueTipComponent.hasSnaggedSomething && entityExists(okrenTongueTipComponent.snagged)) {
         hasSnaggedSomething = true;
      }
   }

   if (!hasSnaggedSomething) {
      tongueRootHitbox.box.offset.y -= 750 / Settings.TPS;
   
      // remove root segment
      if (tongueRootHitbox.box.offset.y < TONGUE_INITIAL_OFFSET) {
         let nextTonguePart: Entity | null = null;
         for (const child of tongueRootTransformComponent.children) {
            if (entityChildIsEntity(child)) {
               nextTonguePart = child.attachedEntity;
               break;
            }
         }
         
         if (nextTonguePart !== null) {
            removeAttachedEntity(tongueRootEntity, nextTonguePart);
            attachEntity(nextTonguePart, okren, hitbox, true);
         } else {
            // final one! !
            combatAI.tongueCooldownTicks = randInt(MIN_TONGUE_COOLDOWN_TICKS, MAX_TONGUE_COOLDOWN_TICKS);
         }
         
         destroyEntity(tongueRootEntity);
      }
   }
}

const getTongueLength = (tongueRootEntity: Entity): number => {
   let currentTransformComponent = TransformComponentArray.getComponent(tongueRootEntity);
   let length = 24;

   while (true) {
      let nextTonguePart: Entity | null = null;
      for (const child of currentTransformComponent.children) {
         if (entityChildIsEntity(child)) {
            nextTonguePart = child.attachedEntity;
            break;
         }
      }

      if (nextTonguePart !== null) {
         currentTransformComponent = TransformComponentArray.getComponent(nextTonguePart);
         length += 24;
      } else {
         break;
      }
   }

   return length;
}

export function runOkrenCombatAI(okren: Entity, aiHelperComponent: AIHelperComponent, combatAI: OkrenCombatAI, target: Entity): void {
   aiHelperComponent.currentAIType = AIType.krumblidCombat;
   
   const okrenComponent = OkrenComponentArray.getComponent(okren);
      
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

   const tongueRootEntity = getTongueRootEntity(transformComponent);
   if (tongueRootEntity === null) {
      if (combatAI.tongueCooldownTicks > 0) {
         combatAI.tongueCooldownTicks--;
      }
      if (combatAI.tongueCooldownTicks === 0) {
         deployTongue(okren, hitbox);
         combatAI.tongueIsRetracting = false;
      }
   } else {
      const tongueLength = getTongueLength(tongueRootEntity);
      if (tongueLength >= 500) {
         combatAI.tongueIsRetracting = true;
      }
      
      if (combatAI.tongueIsRetracting) {
         regressTongue(okren, hitbox, tongueRootEntity, combatAI);
      } else {
         advanceTongue(okren, hitbox, tongueRootEntity);
      }
   }
}