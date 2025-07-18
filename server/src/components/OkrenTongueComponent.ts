import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { assert, customTickIntervalHasPassed, Point, polarVec2, randInt } from "../../../shared/src/utils";
import { MIN_TONGUE_COOLDOWN_TICKS, MAX_TONGUE_COOLDOWN_TICKS } from "../ai/OkrenCombatAI";
import { createEntityConfigAttachInfo } from "../components";
import { createOkrenTongueSegmentConfig } from "../entities/desert/okren-tongue-segment";
import { addHitboxVelocity, applyAcceleration, Hitbox, HitboxAngularTether, turnHitboxToAngle } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { destroyTether, tetherHitboxes } from "../tethers";
import { createEntity, destroyEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { EntityAttachInfo, entityChildIsEntity, TransformComponent, TransformComponentArray } from "./TransformComponent";

export class OkrenTongueComponent {
   public target: Entity;
   
   public isRetracting = false;
   public hasCaughtSomething = false;
   public caughtEntity = 0;

   constructor(target: Entity) {
      this.target = target;
   }
}

export const OkrenTongueComponentArray = new ComponentArray<OkrenTongueComponent>(ServerComponentType.okrenTongue, true, getDataLength, addDataToPacket);
OkrenTongueComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
OkrenTongueComponentArray.onTakeDamage = onTakeDamage;

// @HACK @COPYNPASTE
const TONGUE_INITIAL_OFFSET = 88;
const IDEAL_SEPARATION = 18;
const MAX_TONGUE_LENGTH = 500;

const getTongueBaseEntity = (transformComponent: TransformComponent): Entity => {
   const attachInfo = transformComponent.children[transformComponent.children.length - 1] as EntityAttachInfo;
   return attachInfo.attachedEntity;
}

const getTongueLength = (transformComponent: TransformComponent): number => {
   return IDEAL_SEPARATION * transformComponent.children.length;
}

// @COPYNPASTE
const getTonguePosition = (originHitbox: Hitbox, offsetMagnitude: number): Point => {
   const offsetDirection = originHitbox.box.angle;
   const x = originHitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const y = originHitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
   return new Point(x, y);
}

const getTongueTip = (transformComponent: TransformComponent): Entity => {
   const attachInfo = transformComponent.children[0] as EntityAttachInfo;
   return attachInfo.attachedEntity;
}

const addTongueSegment = (tongue: Entity, okren: Entity, okrenHitbox: Hitbox, previousBaseHitbox: Hitbox, previousBaseTransformComponent: TransformComponent, distance: number): void => {
   const offsetMagnitude = distance - IDEAL_SEPARATION;
   
   // Create the new root entity
   const segmentConfig = createOkrenTongueSegmentConfig(getTonguePosition(okrenHitbox, offsetMagnitude), okrenHitbox.box.angle);
   
   const segmentTransformComponent = segmentConfig.components[ServerComponentType.transform]!;
   const newSegmentHitbox = segmentTransformComponent.children[0] as Hitbox;

   // Remove the old base entities' tether to the okren
   let didFind = false;
   for (let i = 0; i < previousBaseHitbox.angularTethers.length; i++) {
      const angularTether = previousBaseHitbox.angularTethers[i];
      if (angularTether.originHitbox === okrenHitbox) {
         previousBaseHitbox.angularTethers.splice(i, 1);
         didFind = true;
         break;
      }
   }
   if (!didFind) {
      throw new Error();
   }
   
   // Restrict the new base entity to match the direction of the okren
   // (Make sure the root of the tongue begins at the okren's mouth)
   const angularTether: HitboxAngularTether = {
      originHitbox: okrenHitbox,
      idealAngle: 0,
      springConstant: 2.5/60,
      damping: 0.5,
      padding: 0,
      idealHitboxAngleOffset: 0
   };
   newSegmentHitbox.angularTethers.push(angularTether);

   // Tether the old base entity to the new base entity
   tetherHitboxes(previousBaseHitbox, newSegmentHitbox, previousBaseTransformComponent, segmentTransformComponent, IDEAL_SEPARATION, 280, 2.5);
   segmentConfig.attachInfo = createEntityConfigAttachInfo(tongue, newSegmentHitbox, previousBaseHitbox, true);
   previousBaseHitbox.angularTethers.push({
      originHitbox: newSegmentHitbox,
      idealAngle: 0,
      springConstant: 1,
      damping: 0.1,
      padding: 0.03,
      idealHitboxAngleOffset: 0
   });
   
   createEntity(segmentConfig, getEntityLayer(okren), 0);

   // Apply some initial velocity
   addHitboxVelocity(newSegmentHitbox, polarVec2(200, okrenHitbox.box.angle));
}

const advanceTongue = (tongue: Entity, tongueTransformComponent: TransformComponent, okrenTongueComponent: OkrenTongueComponent, okren: Entity): void => {
   const target = okrenTongueComponent.target;
   if (!entityExists(target)) {
      return;
   }

   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.children[0] as Hitbox;

   // Move all the segments to the target, but move the tip more
   for (let i = 0; i < tongueTransformComponent.children.length; i++) {
      const child = tongueTransformComponent.children[i];
      if (!entityChildIsEntity(child)) {
         return;
      }

      const tonguePart = child.attachedEntity;
      const partTransformComponent = TransformComponentArray.getComponent(tonguePart);
      const partHitbox = partTransformComponent.children[0] as Hitbox;

      const targetDir = partHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
      
      let acc: number;
      if (getEntityType(tonguePart) === EntityType.okrenTongueTip) {
         // Tip
         acc = 2800;
      } else if (i === tongueTransformComponent.children.length - 1) {
         // Base segment
         acc = 1200;
      } else {
         // Mid segments
         acc = 600;
      }

      applyAcceleration(partHitbox, polarVec2(acc, targetDir));
      if (getEntityType(tonguePart) === EntityType.okrenTongueTip) {
         turnHitboxToAngle(partHitbox, targetDir, 1, 1, false);
      }
   }

   // Add new segments if needed

   const okrenTransformComponent = TransformComponentArray.getComponent(okren);
   const okrenHitbox = okrenTransformComponent.children[0] as Hitbox;
   
   const tongueBaseEntity = getTongueBaseEntity(tongueTransformComponent);
   const tongueBaseTransformComponent = TransformComponentArray.getComponent(tongueBaseEntity);
   const tongueBaseHitbox = tongueBaseTransformComponent.children[0] as Hitbox;
   const distance = okrenHitbox.box.position.calculateDistanceBetween(tongueBaseHitbox.box.position);

   if (distance >= TONGUE_INITIAL_OFFSET + IDEAL_SEPARATION) {
      addTongueSegment(tongue, okren, okrenHitbox, tongueBaseHitbox, tongueBaseTransformComponent, distance);
   }
}

export function startRetractingTongue(tongue: Entity, okrenTongueComponent: OkrenTongueComponent): void {
   if (okrenTongueComponent.isRetracting) {
      return;
   }
   
   okrenTongueComponent.isRetracting = true;

   const tongueTransformComponent = TransformComponentArray.getComponent(tongue);
   const parentOkren = tongueTransformComponent.parentEntity;

   const okrenTransformComponent = TransformComponentArray.getComponent(parentOkren);
   const okrenHitbox = okrenTransformComponent.children[0] as Hitbox;

   const baseSegmentEntity = (tongueTransformComponent.children[tongueTransformComponent.children.length - 1] as EntityAttachInfo).attachedEntity;
   const tongueBaseTransformComponent = TransformComponentArray.getComponent(baseSegmentEntity);
   const tongueBaseHitbox = tongueBaseTransformComponent.children[0] as Hitbox;
   
   // @Copynpaste
   // Create a tether on the new base hitbox back to the okren to further encourage it!
   const angularTether: HitboxAngularTether = {
      originHitbox: okrenHitbox,
      idealAngle: 0,
      springConstant: 2.5/60,
      damping: 0.5,
      padding: 0,
      idealHitboxAngleOffset: 0
   };
   tongueBaseHitbox.angularTethers.push(angularTether);
   // tongueBaseHitbox.tethers.push(createHitboxTether(tongueBaseHitbox, okrenHitbox, 0, 400/60, 0.5, false));

   // Do an initial jerk back of the tongue as the okren reacts to whatever caused it to want to retract its tongue (be it being hit, reaching max length, or catching something)
   for (let i = 0; i < tongueTransformComponent.children.length; i++) {
      const child = tongueTransformComponent.children[i];
      if (!entityChildIsEntity(child)) {
         return;
      }

      const tonguePart = child.attachedEntity;
      const partTransformComponent = TransformComponentArray.getComponent(tonguePart);
      const partHitbox = partTransformComponent.children[0] as Hitbox;

      const directionToOkren = partHitbox.box.position.calculateAngleBetween(okrenHitbox.box.position);
      addHitboxVelocity(partHitbox, polarVec2(200, directionToOkren));
   }
}

const regressTongue = (tongue: Entity, tongueTransformComponent: TransformComponent, okrenTongueComponent: OkrenTongueComponent, okren: Entity): void => {
   const okrenTransformComponent = TransformComponentArray.getComponent(okren);
   const okrenHitbox = okrenTransformComponent.children[0] as Hitbox;
   
   // Move all the segments to the target, but move the tip more
   for (let i = 0; i < tongueTransformComponent.children.length; i++) {
      const child = tongueTransformComponent.children[i];
      if (!entityChildIsEntity(child)) {
         return;
      }

      const tonguePart = child.attachedEntity;
      const partTransformComponent = TransformComponentArray.getComponent(tonguePart);
      const partHitbox = partTransformComponent.children[0] as Hitbox;

      const homeDir = partHitbox.box.position.calculateAngleBetween(okrenHitbox.box.position);
      
      // @Hack @Incomplete: should pull harder proportional to the amount of resistance the tongue is experiencing
      const MULTIPLIER = 2.3;
      
      let acc: number;
      if (getEntityType(tonguePart) === EntityType.okrenTongueTip) {
         // Tip
         acc = 300 * MULTIPLIER;
      } else if (i === tongueTransformComponent.children.length - 1) {
         // Base segment
         acc = 1500 * MULTIPLIER;
      } else {
         // Mid segments
         acc = 700 * MULTIPLIER;
      }

      applyAcceleration(partHitbox, polarVec2(acc, homeDir));
   }

   const tongueBaseEntity = getTongueBaseEntity(tongueTransformComponent);
   const tongueBaseTransformComponent = TransformComponentArray.getComponent(tongueBaseEntity);
   const tongueBaseHitbox = tongueBaseTransformComponent.children[0] as Hitbox;

   // remove base segment
   const distance = okrenHitbox.box.position.calculateDistanceBetween(tongueBaseHitbox.box.position);
   if (distance < TONGUE_INITIAL_OFFSET) {
      let nextBaseTonguePart: Entity | null;
      if (tongueTransformComponent.children.length > 1) {
         nextBaseTonguePart = (tongueTransformComponent.children[tongueTransformComponent.children.length - 2] as EntityAttachInfo).attachedEntity;
      } else {
         nextBaseTonguePart = null;
      }

      // If the tongue is down to its tip and it's caught something, don't remove it until the catch is dead.
      if (nextBaseTonguePart === null && okrenTongueComponent.hasCaughtSomething && entityExists(okrenTongueComponent.caughtEntity)) {
         return;
      }
      
      if (nextBaseTonguePart !== null) {
         // Remove the tethers the next base part has to the one being removed

         const nextBaseSegementTransformComponent = TransformComponentArray.getComponent(nextBaseTonguePart);
         const nextBaseSegmentHitbox = nextBaseSegementTransformComponent.children[0] as Hitbox;

         let hasFound = false;
         for (let i = 0; i < nextBaseSegmentHitbox.tethers.length; i++) {
            const tether = nextBaseSegmentHitbox.tethers[i];
            const otherHitbox = tether.getOtherHitbox(nextBaseSegmentHitbox);
            if (otherHitbox === tongueBaseHitbox) {
               destroyTether(tether);
               hasFound = true;
               break;
            }
         }
         assert(hasFound);

         hasFound = false;
         for (let i = 0; i < nextBaseSegmentHitbox.angularTethers.length; i++) {
            const tether = nextBaseSegmentHitbox.angularTethers[i];
            if (tether.originHitbox === tongueBaseHitbox) {
               nextBaseSegmentHitbox.angularTethers.splice(i, 1);
               hasFound = true;
               break;
            }
         }
         assert(hasFound);

         // Create a tether on the new base hitbox back to the okren to further encourage it!
         const angularTether: HitboxAngularTether = {
            originHitbox: okrenHitbox,
            idealAngle: 0,
            springConstant: 2.5/60,
            damping: 0.5,
            padding: 0,
            idealHitboxAngleOffset: 0
         };
         nextBaseSegmentHitbox.angularTethers.push(angularTether);
         // nextBaseSegmentHitbox.tethers.push(createHitboxTether(nextBaseSegmentHitbox, okrenHitbox, 0, 400/60, 0.5, false));
      } else {
         // final one! !
         const okrenAIHelperComponent = AIHelperComponentArray.getComponent(okren);
         const combatAI = okrenAIHelperComponent.getOkrenCombatAI();
         combatAI.tongueCooldownTicks = randInt(MIN_TONGUE_COOLDOWN_TICKS, MAX_TONGUE_COOLDOWN_TICKS);
      }
      
      // Destroy the previous base
      destroyEntity(tongueBaseEntity);
   } else if (distance >= TONGUE_INITIAL_OFFSET + IDEAL_SEPARATION) {
      addTongueSegment(tongue, okren, okrenHitbox, tongueBaseHitbox, tongueBaseTransformComponent, distance);
   }
}

function onTick(tongue: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(tongue);
   const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);

   const length = getTongueLength(transformComponent);
   if (length >= MAX_TONGUE_LENGTH) {
      startRetractingTongue(tongue, okrenTongueComponent);
   }

   const parentOkren = transformComponent.parentEntity;
   if (entityExists(parentOkren) && getEntityType(parentOkren) === EntityType.okren) {
      if (okrenTongueComponent.isRetracting) {
         regressTongue(tongue, transformComponent, okrenTongueComponent, parentOkren);
      } else {
         advanceTongue(tongue, transformComponent, okrenTongueComponent, parentOkren);
      }
   }

   if (okrenTongueComponent.hasCaughtSomething && customTickIntervalHasPassed(getEntityAgeTicks(tongue), 0.2)) {
      const tongueTip = getTongueTip(transformComponent);
      const tickEvent: EntityTickEvent = {
         type: EntityTickEventType.tongueLick,
         entityID: tongueTip,
         data: 0
      };
      registerEntityTickEvent(tongueTip, tickEvent);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onTakeDamage(tongue: Entity): void {
   const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);
   startRetractingTongue(tongue, okrenTongueComponent);
}