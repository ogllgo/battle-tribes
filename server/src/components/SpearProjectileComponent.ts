import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { TransformComponentArray } from "./TransformComponent";

const enum Vars {
   DROP_VELOCITY = 300
}

export class SpearProjectileComponent {}

export const SpearProjectileComponentArray = new ComponentArray<SpearProjectileComponent>(ServerComponentType.spearProjectile, true, getDataLength, addDataToPacket);
SpearProjectileComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(spear: Entity): void {
   
   // @Incomplete
   // if (velocitySquared <= Vars.DROP_VELOCITY * Vars.DROP_VELOCITY) {
   //    const transformComponent = TransformComponentArray.getComponent(spear);

   //    const config = createItemEntityConfig(transformComponent.position.copy(), randAngle(), ItemType.spear, 1, null);
   //    createEntity(config, getEntityLayer(spear), 0);
      
   //    destroyEntity(spear);
   // }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}