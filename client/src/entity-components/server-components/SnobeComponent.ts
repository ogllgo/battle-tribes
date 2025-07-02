import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { entityChildIsHitbox } from "./TransformComponent";

export interface SnobeComponentParams {}

interface IntermediateInfo {}

export interface SnobeComponent {}

export const SnobeComponentArray = new ServerComponentArray<SnobeComponent, SnobeComponentParams, IntermediateInfo>(ServerComponentType.snobe, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(): SnobeComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      if (hitbox.flags.includes(HitboxFlag.SNOBE_BODY)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               2,
               0,
               getTextureArrayIndex("entities/snobe/body.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.SNOBE_BUTT)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               1,
               0,
               getTextureArrayIndex("entities/snobe/butt.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.SNOBE_BUTT_BUTT)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               0,
               0,
               getTextureArrayIndex("entities/snobe/butt-butt.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.SNOBE_EAR)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               3,
               0,
               getTextureArrayIndex("entities/snobe/ear.png")
            )
         );
      }
   }

   return {};
}

function createComponent(): SnobeComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}
   
function padData(): void {}

function updateFromData(): void {}