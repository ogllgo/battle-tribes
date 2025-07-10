import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface GlurbBodySegmentComponentParams {}

interface IntermediateInfo {}

export interface GlurbBodySegmentComponent {}

export const GlurbBodySegmentComponentArray = new ServerComponentArray<GlurbBodySegmentComponent, GlurbBodySegmentComponentParams, IntermediateInfo>(ServerComponentType.glurbBodySegment, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

export function createGlurbHeadSegmentComponentParams(): GlurbBodySegmentComponentParams {
   return {};
}

function createParamsFromData(): GlurbBodySegmentComponentParams {
   return createGlurbHeadSegmentComponentParams();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Hack: 0.1 so that the moss ball can be z-index 0
      0.1,
      0,
      getTextureArrayIndex("entities/glurb/glurb-middle-segment.png")
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): GlurbBodySegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}