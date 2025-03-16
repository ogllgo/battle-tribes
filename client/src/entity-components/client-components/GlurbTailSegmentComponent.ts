import { ServerComponentType } from "battletribes-shared/components";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Point } from "../../../../shared/src/utils";
import { createLight } from "../../lights";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface GlurbTailSegmentComponentParams {}

interface IntermediateInfo {}

export interface GlurbTailSegmentComponent {}

export const GlurbTailSegmentComponentArray = new ClientComponentArray<GlurbTailSegmentComponent, IntermediateInfo>(ClientComponentType.glurbTailSegment, true, {
   populateIntermediateInfo: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts
});

function createRenderParts(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   const lightIntensity = 0.3;
   const lightRadius = 4;
   const textureSource = "entities/glurb/glurb-tail-segment.png";
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
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

function createComponent(): GlurbTailSegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}