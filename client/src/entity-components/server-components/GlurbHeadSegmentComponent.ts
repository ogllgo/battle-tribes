import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Point } from "../../../../shared/src/utils";
import { createLight } from "../../lights";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface GlurbHeadSegmentComponentParams {}

interface IntermediateInfo {}

export interface GlurbHeadSegmentComponent {}

export const GlurbHeadSegmentComponentArray = new ServerComponentArray<GlurbHeadSegmentComponent, GlurbHeadSegmentComponentParams, IntermediateInfo>(ServerComponentType.glurbHeadSegment, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

export function createGlurbHeadSegmentComponentParams(): GlurbHeadSegmentComponentParams {
   return {};
}

function createParamsFromData(): GlurbHeadSegmentComponentParams {
   return createGlurbHeadSegmentComponentParams();
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Hack: 0.1 so that the moss ball can be z-index 0
      0.1,
      0,
      getTextureArrayIndex("entities/glurb/glurb-head-segment.png")
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
      
   // Attach light to the render part
   const light = createLight(new Point(0, 0), 0.35, 0.8, 6, 1, 0.2, 0.9);
   entityIntermediateInfo.lights.push({
      light: light,
      attachedRenderPart: renderPart
   });

   // Eyes
   for (let j = 0; j < 2; j++) {
      const eyeRenderPart = new TexturedRenderPart(
         renderPart,
         0,
         0.3,
         getTextureArrayIndex("entities/glurb/glurb-eye.png")
      );
      if (j === 1) {
         eyeRenderPart.setFlipX(true);
      }
      eyeRenderPart.offset.x = 16;
      eyeRenderPart.offset.y = 14;
      entityIntermediateInfo.renderInfo.attachRenderPart(eyeRenderPart);
   }

   return {};
}

function createComponent(): GlurbHeadSegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

function padData(): void {}

function updateFromData(): void {}