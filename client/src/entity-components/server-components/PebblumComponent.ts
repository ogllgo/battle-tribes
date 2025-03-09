import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface PebblumComponentParams {}

interface IntermediateInfo {}

export interface PebblumComponent {}

export const PebblumComponentArray = new ServerComponentArray<PebblumComponent, PebblumComponentParams, IntermediateInfo>(ServerComponentType.pebblum, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): PebblumComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   // Nose
   const nose = new TexturedRenderPart(
      hitbox,
      0,
      2 * Math.PI * Math.random(),
      getTextureArrayIndex("entities/pebblum/pebblum-nose.png")
   )
   nose.offset.y = 12;
   entityIntermediateInfo.renderInfo.attachRenderPart(nose);

   // Body
   const body = new TexturedRenderPart(
      hitbox,
      1,
      2 * Math.PI * Math.random(),
      getTextureArrayIndex("entities/pebblum/pebblum-body.png")
   )
   body.offset.y = -8;
   entityIntermediateInfo.renderInfo.attachRenderPart(body);

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