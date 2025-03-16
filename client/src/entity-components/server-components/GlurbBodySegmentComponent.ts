import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Point } from "../../../../shared/src/utils";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { createLight } from "../../lights";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

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

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   let textureSource: string;
   let lightIntensity: number;
   let lightRadius: number;
   if (hitbox.flags.includes(HitboxFlag.GLURB_TAIL_SEGMENT)) {
      // Tail segment
      lightIntensity = 0.3;
      lightRadius = 4;
      textureSource = "entities/glurb/glurb-tail-segment.png";
   } else {
      // Middle segment
      lightIntensity = 0.4;
      lightRadius = 8;
      textureSource = "entities/glurb/glurb-middle-segment.png";
   }
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Hack: 0.1 so that the moss ball can be z-index 0
      0.1,
      0,
      getTextureArrayIndex(textureSource)
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
      
   // Attach light to the render part
   const light = createLight(new Point(0, 0), lightIntensity, 0.8, lightRadius, 1, 0.2, 0.9);
   entityIntermediateInfo.lights.push({
      light: light,
      attachedRenderPart: renderPart
   });

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