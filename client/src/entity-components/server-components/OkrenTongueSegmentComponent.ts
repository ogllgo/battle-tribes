import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface OkrenTongueSegmentComponentParams {}

interface IntermediateInfo {}

export interface OkrenTongueSegmentComponent {}

export const OkrenTongueSegmentComponentArray = new ServerComponentArray<OkrenTongueSegmentComponent, OkrenTongueSegmentComponentParams, IntermediateInfo>(ServerComponentType.okrenTongueSegment, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/okren/tongue-segment.png")
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

export function createOkrenTongueSegmentComponentParams(): OkrenTongueSegmentComponentParams {
   return {};
}

function createParamsFromData(): OkrenTongueSegmentComponentParams {
   return createOkrenTongueSegmentComponentParams();
}

function createComponent(): OkrenTongueSegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}