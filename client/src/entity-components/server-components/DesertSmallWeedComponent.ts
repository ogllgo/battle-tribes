import { ServerComponentType } from "../../../../shared/src/components";
import { randFloat } from "../../../../shared/src/utils";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface DesertSmallWeedComponentParams {}

interface IntermediateInfo {}

export interface DesertSmallWeedComponent {}

export const DesertSmallWeedComponentArray = new ServerComponentArray<DesertSmallWeedComponent, DesertSmallWeedComponentParams, IntermediateInfo>(ServerComponentType.desertSmallWeed, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): DesertSmallWeedComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/desert-small-weed/desert-small-weed.png")
   );
   renderPart.tintR = randFloat(-0.03, 0.03);
   renderPart.tintG = randFloat(-0.03, 0.03);
   renderPart.tintB = randFloat(-0.03, 0.03);
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart)

   return {
      renderPart: renderPart
   };
}

function createComponent(): DesertSmallWeedComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}