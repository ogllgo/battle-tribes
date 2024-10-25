import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface FrostshaperComponentParams {}

interface RenderParts {}

export interface FrostshaperComponent {}

export const FrostshaperComponentArray = new ClientComponentArray<FrostshaperComponent, RenderParts>(ClientComponentType.frostshaper, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent
});

export function createFrostshaperComponentParams(): FrostshaperComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderThing(
      new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("entities/frostshaper/frostshaper.png")
      )
   );

   return {};
}

function createComponent(): FrostshaperComponent {
   return {};
}