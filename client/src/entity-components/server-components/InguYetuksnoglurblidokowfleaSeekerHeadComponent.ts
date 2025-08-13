import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";

export interface InguYetuksnoglurblidokowfleaSeekerHeadComponentParams {}

interface IntermediateInfo {}

export interface InguYetuksnoglurblidokowfleaSeekerHeadComponent {}

export const InguYetuksnoglurblidokowfleaSeekerHeadComponentArray = new ServerComponentArray<InguYetuksnoglurblidokowfleaSeekerHeadComponent, InguYetuksnoglurblidokowfleaSeekerHeadComponentParams, IntermediateInfo>(ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

export function createInguYetuksnoglurblidokowfleaSeekerHeadComponentParams(): InguYetuksnoglurblidokowfleaSeekerHeadComponentParams {
   return {};
}

function createParamsFromData(): InguYetuksnoglurblidokowfleaSeekerHeadComponentParams {
   return createInguYetuksnoglurblidokowfleaSeekerHeadComponentParams();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   for (let i = 0; i < transformComponentParams.hitboxes.length; i++) {
      const hitbox = transformComponentParams.hitboxes[i];
      if (hitbox.flags.includes(HitboxFlag.YETUK_TRUNK_MIDDLE)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            getTextureArrayIndex("entities/tukmok-trunk/middle-segment.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_TRUNK_HEAD)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            getTextureArrayIndex("entities/tukmok-trunk/head-segment.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.COW_HEAD)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            getTextureArrayIndex("entities/cow/cow-head-1.png")
         );
         renderInfo.attachRenderPart(renderPart);
      }
   }

   return {};
}

function createComponent(): InguYetuksnoglurblidokowfleaSeekerHeadComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 50;
}

function padData(): void {}

function updateFromData(): void {}