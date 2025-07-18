import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface TukmokTailComponentParams {}

interface IntermediateInfo {}

export interface TukmokTailComponent {}

export const TukmokTailComponentArray = new ServerComponentArray<TukmokTailComponent, TukmokTailComponentParams, IntermediateInfo>(ServerComponentType.tukmokTail, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): TukmokTailComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   for (let i = 0; i < transformComponentParams.hitboxes.length; i++) {
      const hitbox = transformComponentParams.hitboxes[i];

      let textureSource: string;
      if (hitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_CLUB)) {
         textureSource = "entities/tukmok-tail/club-segment.png";
      } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_SMALL)) {
         textureSource = "entities/tukmok-tail/middle-segment-small.png";
      } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_MEDIUM)) {
         textureSource = "entities/tukmok-tail/middle-segment-medium.png";
      } else {
         textureSource = "entities/tukmok-tail/middle-segment-big.png";
      }
      
      renderInfo.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            i * 0.02,
            0,
            getTextureArrayIndex(textureSource)
         )
      );
   }

   return {};
}

function createComponent(): TukmokTailComponent {
   return {};
}

function getMaxRenderParts(): number {
   // @HACK cuz we can't access the num segments constant defined in the server
   return 12;
}

function padData(): void {}

function updateFromData(): void {}