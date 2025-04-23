import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType, EntityTypeString } from "../../../shared/src/entities";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { Point } from "../../../shared/src/utils";
import { createHitboxTether, getTotalMass, Hitbox } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray } from "./HealthComponent";
import { OkrenTongueComponentArray, startRetractingTongue } from "./OkrenTongueComponent";
import { PhysicsComponent, PhysicsComponentArray } from "./PhysicsComponent";
import { attachEntity, TransformComponentArray } from "./TransformComponent";

export class OkrenTongueTipComponent {}

export const OkrenTongueTipComponentArray = new ComponentArray<OkrenTongueTipComponent>(ServerComponentType.okrenTongueTip, true, getDataLength, addDataToPacket);
OkrenTongueTipComponentArray.onHitboxCollision = onHitboxCollision;

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

   const mass = getTotalMass(entity);
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
      if (tether.originHitbox === affectedHitbox) {
         return;
      }
   }

   // @HACK: have to put it on the colliding hitbox so that if the player is the one being snagged, they know they are tethered to the tongue and so can update their phsycis.
   const tether = createHitboxTether(collidingHitbox, affectedHitbox, 0, 100, 2, true);
   collidingHitbox.tethers.push(tether);
   // attachEntity(collidingEntity, tongueTip, affectedHitbox, false);

   const tongueTipTransformComponent = TransformComponentArray.getComponent(tongueTip);
   const tongue = tongueTipTransformComponent.parentEntity;
   const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);
   startRetractingTongue(tongue, okrenTongueComponent);
   okrenTongueComponent.hasCaughtSomething = true;
   // @Hack
   okrenTongueComponent.caughtEntity = collidingEntity;

   const tickEvent: EntityTickEvent = {
      type: EntityTickEventType.tongueGrab,
      entityID: tongueTip,
      data: 0
   };
   registerEntityTickEvent(tongueTip, tickEvent);
}