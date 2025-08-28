import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";

export interface OkrenTongueComponentParams {}

interface IntermediateInfo {}

export interface OkrenTongueComponent {}

export const OkrenTongueComponentArray = new ServerComponentArray<OkrenTongueComponent, OkrenTongueComponentParams, IntermediateInfo>(ServerComponentType.okrenTongue, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

export function createOkrenTongueComponentParams(): OkrenTongueComponentParams {
   return {};
}

function createParamsFromData(): OkrenTongueComponentParams {
   return createOkrenTongueComponentParams();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   for (const hitbox of transformComponentParams.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.OKREN_TONGUE_SEGMENT_MIDDLE)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex("entities/okren/tongue-segment.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_TONGUE_SEGMENT_TIP)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex("entities/okren/tongue-tip.png")
         );
         renderInfo.attachRenderPart(renderPart);
      }
   }

   return {};
}

function createComponent(): OkrenTongueComponent {
   return {};
}

function getMaxRenderParts(): number {
   // @HACK cuz tehre isn't a limit!!
   return 100;
}

function padData(): void {}

function updateFromData(): void {}