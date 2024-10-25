import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface LilypadComponentParams {}

interface RenderParts {}

export interface LilypadComponent {}

export const LilypadComponentArray = new ClientComponentArray<LilypadComponent, RenderParts>(ClientComponentType.lilypad, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent
});

export function createLilypadComponentParams(): LilypadComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderThing(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/lilypad/lilypad.png")
      )
   );

   return {};
}

function createComponent(): LilypadComponent {
   return {};
}