import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";

export interface InguYetuksnoglurblidokfleaComponentParams {}

interface IntermediateInfo {}

export interface InguYetuksnoglurblidokfleaComponent {}

export const InguYetuksnoglurblidokfleaComponentArray = new ServerComponentArray<InguYetuksnoglurblidokfleaComponent, InguYetuksnoglurblidokfleaComponentParams, IntermediateInfo>(ServerComponentType.inguYetuksnoglurblidokflea, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

export function createInguYetuksnoglurblidokfleaComponentParams(): InguYetuksnoglurblidokfleaComponentParams {
   return {};
}

function createParamsFromData(): InguYetuksnoglurblidokfleaComponentParams {
   return createInguYetuksnoglurblidokfleaComponentParams();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   for (const hitbox of transformComponentParams.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_1)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokflea/body-1.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_2)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            3,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokflea/body-2.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_3)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            2,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokflea/body-3.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_4)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            1,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokflea/body-4.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_GLURB_SEGMENT)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex("entities/glurb/glurb-middle-segment.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETI_HEAD)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            5,
            0,
            getTextureArrayIndex("entities/yeti/yeti-head.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_BIG)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.8,
            0,
            getTextureArrayIndex("entities/okren/adult/mandible.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_MEDIUM)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            getTextureArrayIndex("entities/okren/juvenile/mandible.png")
         );
         renderInfo.attachRenderPart(renderPart);
      }
   }

   return {};
}

function createComponent(): InguYetuksnoglurblidokfleaComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 12;
}

function padData(): void {}

function updateFromData(): void {}