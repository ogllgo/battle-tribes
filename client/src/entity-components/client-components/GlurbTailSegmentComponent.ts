import { ServerComponentType } from "battletribes-shared/components";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface GlurbTailSegmentComponentParams {}

interface IntermediateInfo {}

export interface GlurbTailSegmentComponent {}

export const GlurbTailSegmentComponentArray = new ClientComponentArray<GlurbTailSegmentComponent, IntermediateInfo>(ClientComponentType.glurbTailSegment, true, {
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts
});

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const textureSource = "entities/glurb/glurb-tail-segment.png";
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Hack: 0.1 so that the moss ball can be z-index 0
      0.1,
      0,
      getTextureArrayIndex(textureSource)
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): GlurbTailSegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}