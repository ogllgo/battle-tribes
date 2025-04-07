import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface OkrenTongueTipComponentParams {}

interface IntermediateInfo {}

export interface OkrenTongueTipComponent {}

export const OkrenTongueTipComponentArray = new ServerComponentArray<OkrenTongueTipComponent, OkrenTongueTipComponentParams, IntermediateInfo>(ServerComponentType.okrenTongueTip, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/okren/tongue-tip.png")
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   return {};
}

export function createOkrenTongueTipComponentParams(): OkrenTongueTipComponentParams {
   return {};
}

function createParamsFromData(): OkrenTongueTipComponentParams {
   return createOkrenTongueTipComponentParams();
}

function createComponent(): OkrenTongueTipComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}