import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { Point } from "../../../shared/src/utils";
import { getHitboxTotalMassIncludingChildren, Hitbox } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { tetherHitboxes } from "../tethers";
import { getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray } from "./HealthComponent";
import { OkrenTongueComponentArray, startRetractingTongue } from "./OkrenTongueComponent";
import { PhysicsComponent, PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";

export class OkrenTongueTipComponent {}

export const OkrenTongueTipComponentArray = new ComponentArray<OkrenTongueTipComponent>(ServerComponentType.okrenTongueTip, true, getDataLength, addDataToPacket);
OkrenTongueTipComponentArray.onHitboxCollision = onHitboxCollision;
OkrenTongueTipComponentArray.onTakeDamage = onTakeDamage;

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

const entityIsSnaggable = (entity: Entity): boolean => {
   if (!HealthComponentArray.hasComponent(entity)) {
      return false;
   }

   if (!PhysicsComponentArray.hasComponent(entity)) {
      return false;
   }

   const physicsComponent = new PhysicsComponent();
   if (physicsComponent.isImmovable) {
      return false;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const mass = getHitboxTotalMassIncludingChildren(hitbox);
   if (mass > 2) {
      return false;
   }

   // @Hack
   if (getEntityType(entity) === EntityType.okrenTongueSegment || getEntityType(entity) === EntityType.okrenTongueTip) {
      return false;
   }

   return true;
}

function onHitboxCollision(tongueTip: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   if (!entityIsSnaggable(collidingEntity)) {
      return;
   }

   // Don't snag if the hitbox is already tethered
   for (const tether of collidingHitbox.tethers) {
      const otherHitbox = tether.getOtherHitbox(collidingHitbox);
      if (otherHitbox === affectedHitbox) {
         return;
      }
   }

   // @INCOMPLETE
   
   // {
   // const tongueTipTransformComponent = TransformComponentArray.getComponent(tongueTip);
   // const tongue = tongueTipTransformComponent.parentEntity;
   // const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);
   //    // @Hack @Temporary
   //    if (okrenTongueComponent.isRetracting) {
   //       return;
   //    }
   // }

   // const tongueTipTransformComponent = TransformComponentArray.getComponent(tongueTip);

   // const collidingHitboxTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   // tetherHitboxes(collidingHitbox, affectedHitbox, collidingHitboxTransformComponent, tongueTipTransformComponent, 0, 100, 2);

   // const tongue = tongueTipTransformComponent.parentEntity;
   // const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);
   // startRetractingTongue(tongue, okrenTongueComponent);
   // okrenTongueComponent.hasCaughtSomething = true;
   // // @Hack
   // okrenTongueComponent.caughtEntity = collidingEntity;

   // const tickEvent: EntityTickEvent = {
   //    type: EntityTickEventType.tongueGrab,
   //    entityID: tongueTip,
   //    data: 0
   // };
   // registerEntityTickEvent(tongueTip, tickEvent);
}

// @Copynpaste
function onTakeDamage(tongueTip: Entity): void {
   // @INCOMPLETE
   
   // @Copynpaste
   // const tongueTipTransformComponent = TransformComponentArray.getComponent(tongueTip);
   // const tongue = tongueTipTransformComponent.parentEntity;
   // const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);
   // startRetractingTongue(tongue, okrenTongueComponent);
}