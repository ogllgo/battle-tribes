import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { randAngle } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";

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

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   // Nose
   const nose = new TexturedRenderPart(
      hitbox,
      0,
      randAngle(),
      getTextureArrayIndex("entities/pebblum/pebblum-nose.png")
   )
   nose.offset.y = 12;
   renderInfo.attachRenderPart(nose);

   // Body
   const body = new TexturedRenderPart(
      hitbox,
      1,
      randAngle(),
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