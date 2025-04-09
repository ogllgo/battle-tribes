import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { lerp } from "battletribes-shared/utils";
import { ThrowingProjectileComponentArray } from "./ThrowingProjectileComponent";
import { TransformComponentArray } from "./TransformComponent";
import { destroyEntity, entityExists, getEntityAgeTicks } from "../world";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { addHitboxAngularAcceleration, Hitbox, turnHitboxToAngle } from "../hitboxes";

const enum Vars {
   RETURN_TIME_TICKS = 1 * Settings.TPS
}

export class BattleaxeProjectileComponent {}

export const BattleaxeProjectileComponentArray = new ComponentArray<BattleaxeProjectileComponent>(ServerComponentType.battleaxeProjectile, true, getDataLength, addDataToPacket);
BattleaxeProjectileComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(battleaxe: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(battleaxe);
   const battleaxeHitbox = transformComponent.children[0] as Hitbox;

   const ageTicks = getEntityAgeTicks(battleaxe);
   if (ageTicks < Vars.RETURN_TIME_TICKS) {
      addHitboxAngularAcceleration(battleaxeHitbox, -6 * Math.PI);
   } else {
      const throwingProjectileComponent = ThrowingProjectileComponentArray.getComponent(battleaxe);

      if (!entityExists(throwingProjectileComponent.tribeMember)) {
         destroyEntity(battleaxe);
         return;
      }
      
      if (entitiesAreColliding(battleaxe, throwingProjectileComponent.tribeMember) !== CollisionVars.NO_COLLISION) {
         destroyEntity(battleaxe);
         return;
      }

      
      const ownerTransformComponent = TransformComponentArray.getComponent(throwingProjectileComponent.tribeMember);
      const ownerHitbox = ownerTransformComponent.children[0] as Hitbox;
      
      const ageTicks = getEntityAgeTicks(battleaxe);
      const ticksSinceReturn = ageTicks - Vars.RETURN_TIME_TICKS;
      battleaxeHitbox.box.relativeAngle -= lerp(6 * Math.PI / Settings.TPS, 0, Math.min(ticksSinceReturn / Settings.TPS * 1.25, 1));

      // @Hack: Just set velocity instead of adding to position
      const returnDirection = battleaxeHitbox.box.position.calculateAngleBetween(ownerHitbox.box.position);
      const returnSpeed = lerp(0, 800, Math.min(ticksSinceReturn / Settings.TPS * 1.5, 1));
      battleaxeHitbox.box.position.x += returnSpeed * Settings.I_TPS * Math.sin(returnDirection);
      battleaxeHitbox.box.position.y += returnSpeed * Settings.I_TPS * Math.cos(returnDirection);
      transformComponent.isDirty = true;

      // Turn to face the owner
      turnHitboxToAngle(battleaxeHitbox, returnDirection, ticksSinceReturn / Settings.TPS * Math.PI, 0.5, false);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}