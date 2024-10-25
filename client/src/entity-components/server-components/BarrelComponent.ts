import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityID } from "../../../../shared/src/entities";
import { playBuildingHitSound, playSound } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";

export interface BarrelComponentParams {}

interface RenderParts {}

export interface BarrelComponent {}

export const BarrelComponentArray = new ServerComponentArray<BarrelComponent, BarrelComponentParams, RenderParts>(ServerComponentType.barrel, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderThing(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/barrel/barrel.png")
      )
   );

   return {};
}

function createParamsFromData(): BarrelComponentParams {
   return {};
}

function createComponent(): BarrelComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}

function onHit(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playBuildingHitSound(transformComponent.position);
}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("building-destroy-1.mp3", 0.4, 1, transformComponent.position);
}