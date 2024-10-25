import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface SpearProjectileComponentParams {}

interface RenderParts {}

export interface SpearProjectileComponent {}

export const SpearProjectileComponentArray = new ServerComponentArray<SpearProjectileComponent, SpearProjectileComponentParams, RenderParts>(ServerComponentType.spearProjectile, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onSpawn: onSpawn,
   padData: padData,
   updateFromData: updateFromData,
   onDie: onDie
});

function createParamsFromData(): SpearProjectileComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderThing(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("items/misc/spear.png")
      )
   );

   return {};
}

function createComponent(): SpearProjectileComponent {
   return {};
}

function onSpawn(_spearProjectileComponent: SpearProjectileComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("spear-throw.mp3", 0.4, 1, transformComponent.position);
}

function padData(): void {}

function updateFromData(): void {}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("spear-hit.mp3", 0.4, 1, transformComponent.position);
}