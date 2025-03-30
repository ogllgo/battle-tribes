import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { entityChildIsHitbox } from "./TransformComponent";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";

export interface OkrenComponentParams {}

interface IntermediateInfo {}

export interface OkrenComponent {}

export const OkrenComponentArray = new ServerComponentArray<OkrenComponent, OkrenComponentParams, IntermediateInfo>(ServerComponentType.okren, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(): OkrenComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      if (hitbox.flags.includes(HitboxFlag.OKREN_BODY)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               3,
               0,
               getTextureArrayIndex("entities/okren/body.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_EYE)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               5,
               0,
               getTextureArrayIndex("entities/okren/eye.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_MANDIBLE)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               2,
               0,
               getTextureArrayIndex("entities/okren/mandible.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_BIG_ARM_SEGMENT)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               2,
               0,
               getTextureArrayIndex("entities/okren/big-arm-segment.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               1,
               0,
               getTextureArrayIndex("entities/okren/medium-arm-segment.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               0,
               0,
               getTextureArrayIndex("entities/okren/arm-segment-of-slashing-and-destruction.png")
            )
         );
      }
   }

   return {};
}

function createComponent(): OkrenComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 11;
}
   
function padData(reader: PacketReader): void {}

function updateFromData(reader: PacketReader): void {}