import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";

export interface CampfireComponentParams {}

interface RenderParts {}

export interface CampfireComponent {}

export const CampfireComponentArray = new ServerComponentArray<CampfireComponent, CampfireComponentParams, RenderParts>(ServerComponentType.campfire, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

export function createCampfireComponentParams(): CampfireComponentParams {
   return {};
}

function createParamsFromData(): CampfireComponentParams {
   return createCampfireComponentParams();
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/campfire/campfire.png")
      )
   );

   return {};
}

function createComponent(): CampfireComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}