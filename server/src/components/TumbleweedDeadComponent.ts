import { Biome } from "../../../shared/src/biomes";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { Point } from "../../../shared/src/utils";
import { applyAccelerationFromGround, getHitboxTile, Hitbox } from "../hitboxes";
import { getWindVector } from "../wind";
import { destroyEntity, getEntityLayer, getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { attachEntity, TransformComponentArray } from "./TransformComponent";

export class TumbleweedDeadComponent {
   public isRooted = true;
   public ticksUnrooted = 0;
}

const getTumbleweedDecayChance = (tumbleweed: Entity, hitbox: Hitbox): number => {
   const layer = getEntityLayer(tumbleweed);
   const tile = getHitboxTile(hitbox);
   if (layer.getTileBiome(tile) === Biome.desert) {
      return 0.02;
   } else {
      return 0.08;
   }
}

export const TumbleweedDeadComponentArray = new ComponentArray<TumbleweedDeadComponent>(ServerComponentType.tumbleweedDead, true, getDataLength, addDataToPacket);
TumbleweedDeadComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
TumbleweedDeadComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(tumbleweed: Entity): void {
   const tumbleweedDeadComponent = TumbleweedDeadComponentArray.getComponent(tumbleweed);
   // @Incomplete: never gets unrooted!
   // if (Math.random() < 0.04 / Settings.TPS) {
   //    tumbleweedDeadComponent.isRooted = false;
   // }
   
   if (!tumbleweedDeadComponent.isRooted) {
      const transformComponent = TransformComponentArray.getComponent(tumbleweed);
      const hitbox = transformComponent.children[0] as Hitbox;
   
      const wind = getWindVector(hitbox.box.position.x, hitbox.box.position.y);
      applyAccelerationFromGround(tumbleweed, hitbox, wind.x, wind.y);

      tumbleweedDeadComponent.ticksUnrooted++;

      const decayChance = getTumbleweedDecayChance(tumbleweed, hitbox);
      if (tumbleweedDeadComponent.ticksUnrooted >= 35 * Settings.TPS && Math.random() < decayChance / Settings.TPS) {
         destroyEntity(tumbleweed);
      }
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(tumbleweed: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   if (getEntityType(collidingEntity) !== EntityType.tumbleweedDead) {
      return;
   }

   // Attach to the other tumbleweed!
   const transformComponent = TransformComponentArray.getComponent(tumbleweed);
   if (transformComponent.rootEntity === tumbleweed) {
      const otherTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      if (transformComponent.rootEntity !== otherTransformComponent.rootEntity) {
         // @Hack: what if i change their radius?
         const hitbox = transformComponent.children[0] as Hitbox;
         const otherHitbox = otherTransformComponent.children[0] as Hitbox;
         const dist = hitbox.box.position.calculateDistanceBetween(otherHitbox.box.position);
         if (dist < 70) {
            attachEntity(tumbleweed, collidingEntity, collidingHitbox, false);
         }
      }
   }
}