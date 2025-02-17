import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";

export interface PebblumComponentParams {}

interface RenderParts {}

export interface PebblumComponent {}

export const PebblumComponentArray = new ServerComponentArray<PebblumComponent, PebblumComponentParams, RenderParts>(ServerComponentType.pebblum, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): PebblumComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   // Nose
   const nose = new TexturedRenderPart(
      null,
      0,
      2 * Math.PI * Math.random(),
      getTextureArrayIndex("entities/pebblum/pebblum-nose.png")
   )
   nose.offset.y = 12;
   renderInfo.attachRenderPart(nose);

   // Body
   const body = new TexturedRenderPart(
      null,
      1,
      2 * Math.PI * Math.random(),
      getTextureArrayIndex("entities/pebblum/pebblum-body.png")
   )
   body.offset.y = -8;
   renderInfo.attachRenderPart(body);

   return {};
}

function createComponent(): PebblumComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 2;
}

function padData(): void {}

function updateFromData(): void {}