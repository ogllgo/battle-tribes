import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { assert, Point } from "../../../shared/src/utils";
import { createEntityConfigAttachInfo } from "../components";
import { createOkrenTongueSegmentConfig } from "../entities/desert/okren-tongue-segment";
import { createEntity } from "../Entity";
import { applyAcceleration, createHitboxTether, Hitbox, HitboxAngularTether, turnHitboxToAngle } from "../hitboxes";
import { entityExists, getEntityLayer, getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { EntityAttachInfo, entityChildIsEntity, TransformComponent, TransformComponentArray } from "./TransformComponent";

export class OkrenTongueComponent {
   public target: Entity = 0;
   
   public isRetracting = false;
}

export const OkrenTongueComponentArray = new ComponentArray<OkrenTongueComponent>(ServerComponentType.okrenTongue, true, getDataLength, addDataToPacket);
OkrenTongueComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
OkrenTongueComponentArray.onTakeDamage = onTakeDamage;

// @HACK @COPYNPASTE
const TONGUE_INITIAL_OFFSET = 88;
const IDEAL_SEPARATION = 22;

const getTipEntity = (transformComponent: TransformComponent): Entity => {
   const attachInfo = transformComponent.children[0] as EntityAttachInfo;
   assert(getEntityType(attachInfo.attachedEntity) === EntityType.okrenTongueTip);
   return attachInfo.attachedEntity;
}

const getTongueBaseEntity = (transformComponent: TransformComponent): Entity => {
   const attachInfo = transformComponent.children[transformComponent.children.length - 1] as EntityAttachInfo;
   return attachInfo.attachedEntity;
}

const getTongueLength = (transformComponent: TransformComponent): number => {
   return 24 * transformComponent.children.length;
}

// @COPYNPASTE
const getTonguePosition = (originHitbox: Hitbox, offsetMagnitude: number): Point => {
   const offsetDirection = originHitbox.box.angle;
   const x = originHitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const y = originHitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
   return new Point(x, y);
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

      const directionToTarget = partHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
      
      let acc: number;
      if (getEntityType(tonguePart) === EntityType.okrenTongueTip) {
         // Tip
         acc = 1200;
      } else if (i === tongueTransformComponent.children.length - 1) {
         // Base segment
         acc = 1200;
      } else {
         // Mid segments
         acc = 100;
      }

      const accX = acc * Math.sin(directionToTarget);
      const accY = acc * Math.cos(directionToTarget);
      applyAcceleration(partHitbox, accX, accY);
      if (getEntityType(tonguePart) === EntityType.okrenTongueTip) {
         turnHitboxToAngle(partHitbox, directionToTarget, 1, 1, false);
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
      const offsetMagnitude = distance - IDEAL_SEPARATION;
      
      // Create the new root entity
      const segmentConfig = createOkrenTongueSegmentConfig(getTonguePosition(okrenHitbox, offsetMagnitude), okrenHitbox.box.angle);
      
      const segmentTransformComponent = segmentConfig.components[ServerComponentType.transform]!;
      const newSegmentHitbox = segmentTransformComponent.children[0] as Hitbox;

      // Remove the old base entities' tether to the okren
      let didFind = false;
      for (let i = 0; i < tongueBaseHitbox.angularTethers.length; i++) {
         const angularTether = tongueBaseHitbox.angularTethers[i];
         if (angularTether.originHitbox === okrenHitbox) {
            tongueBaseHitbox.angularTethers.splice(i, 1);
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
         springConstant: 2.5,
         angularDamping: 0.5,
         padding: 0
      };
      newSegmentHitbox.angularTethers.push(angularTether);

      // Tether the old base entity to the new base entity
      tongueBaseHitbox.tethers.push(createHitboxTether(tongueBaseHitbox, newSegmentHitbox, IDEAL_SEPARATION, 500, 4, true));
      segmentConfig.attachInfo = createEntityConfigAttachInfo(tongue, null, true);
      tongueBaseHitbox.angularTethers.push({
         originHitbox: newSegmentHitbox,
         springConstant: 3,
         angularDamping: 1,
         padding: 0.05
      });
      
      createEntity(segmentConfig, getEntityLayer(okren), 0);
   }
}

// const regressTongue = (okren: Entity, hitbox: Hitbox, tongueRootEntity: Entity, combatAI: OkrenCombatAI): void => {
//    const tongueRootTransformComponent = TransformComponentArray.getComponent(tongueRootEntity);
//    const tongueRootHitbox = tongueRootTransformComponent.children[0] as Hitbox;

//    let hasSnaggedSomething = false;
//    if (getEntityType(tongueRootEntity) === EntityType.okrenTongueTip) {
//       const okrenTongueTipComponent = OkrenTongueTipComponentArray.getComponent(tongueRootEntity);
//       if (okrenTongueTipComponent.hasSnaggedSomething && entityExists(okrenTongueTipComponent.snagged)) {
//          hasSnaggedSomething = true;
//       }
//    }

//    if (!hasSnaggedSomething) {
//       tongueRootHitbox.box.offset.y -= 750 / Settings.TPS;
   
//       // remove root segment
//       if (tongueRootHitbox.box.offset.y < TONGUE_INITIAL_OFFSET) {
//          let nextTonguePart: Entity | null = null;
//          for (const child of tongueRootTransformComponent.children) {
//             if (entityChildIsEntity(child)) {
//                nextTonguePart = child.attachedEntity;
//                break;
//             }
//          }
         
//          if (nextTonguePart !== null) {
//             removeAttachedEntity(tongueRootEntity, nextTonguePart);
//             attachEntity(nextTonguePart, okren, hitbox, true);
//          } else {
//             // final one! !
//             combatAI.tongueCooldownTicks = randInt(MIN_TONGUE_COOLDOWN_TICKS, MAX_TONGUE_COOLDOWN_TICKS);
//          }
         
//          destroyEntity(tongueRootEntity);
//       }
//    }
// }

function onTick(tongue: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(tongue);
   const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);

   const length = getTongueLength(transformComponent);
   if (length >= 500) {
      okrenTongueComponent.isRetracting = true;
   }

   const parentOkren = transformComponent.parentEntity;
   if (entityExists(parentOkren) && getEntityType(parentOkren) === EntityType.okren) {
      if (okrenTongueComponent.isRetracting) {
         // regressTongue(parentOkren, hitbox, tongueRootEntity, combatAI);
      } else {
         advanceTongue(tongue, transformComponent, okrenTongueComponent, parentOkren);
      }
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onTakeDamage(tongue: Entity): void {
   const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);
   okrenTongueComponent.isRetracting = true;
}