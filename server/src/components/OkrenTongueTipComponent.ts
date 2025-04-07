import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { Hitbox } from "../hitboxes";
import { getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
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

function onHitboxCollision(tongueTip: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   if (getEntityType(collidingEntity) !== EntityType.player) {
      return;
   }

   const victimTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   victimTransformComponent.addHitboxTether(collidingHitbox, affectedHitbox, 0, 15, 0.5, false);

   const okrenTongueTipComponent = OkrenTongueTipComponentArray.getComponent(tongueTip);
   okrenTongueTipComponent.hasSnaggedSomething = true;
   okrenTongueTipComponent.snagged = collidingEntity;

   // attachEntity(collidingEntity, tongueTip, affectedHitbox, false);
}