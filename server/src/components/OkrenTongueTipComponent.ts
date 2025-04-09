import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType, EntityTypeString } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { createHitboxTether, getTotalMass, Hitbox } from "../hitboxes";
import { getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray } from "./HealthComponent";
import { PhysicsComponent, PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";

export class OkrenTongueTipComponent {
   // @HACK! should instead just hceck if the tether existss
   public hasSnaggedSomething = false;
   public snagged = 0;
}

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
   for (const tether of affectedHitbox.tethers) {
      if (tether.originHitbox === affectedHitbox) {
         return;
      }
   }

   const tether = createHitboxTether(collidingHitbox, affectedHitbox, 0, 15, 0.5, false);
   collidingHitbox.tethers.push(tether);

   const okrenTongueTipComponent = OkrenTongueTipComponentArray.getComponent(tongueTip);
   okrenTongueTipComponent.hasSnaggedSomething = true;
   okrenTongueTipComponent.snagged = collidingEntity;
}