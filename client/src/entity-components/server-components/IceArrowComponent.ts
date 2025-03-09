import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { createIceSpeckProjectile, createSnowflakeParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { Entity } from "battletribes-shared/entities";
import ServerComponentArray from "../ServerComponentArray";
import { Hitbox } from "../../hitboxes";

export interface IceArrowComponentParams {}

export interface IceArrowComponent {}

export const IceArrowComponentArray = new ServerComponentArray<IceArrowComponent, IceArrowComponentParams, never>(ServerComponentType.iceArrow, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   onRemove: onRemove,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): IceArrowComponentParams {
   return {};
}

function createComponent(): IceArrowComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   if (Math.random() < 30 / Settings.TPS) {
      createSnowflakeParticle(hitbox.box.position.x, hitbox.box.position.y);
   }

   if (Math.random() < 30 / Settings.TPS) {
      // @Incomplete: These types of particles don't fit
      createIceSpeckProjectile(transformComponent);
   }

   // @Incomplete: Need snow speck particles
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < 6; i++) {
      createIceSpeckProjectile(transformComponent);
   }
}

function padData(): void {}

function updateFromData(): void {}