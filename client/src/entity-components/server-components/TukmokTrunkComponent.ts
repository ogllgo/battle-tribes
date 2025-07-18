import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface TukmokTrunkComponentParams {}

interface IntermediateInfo {}

export interface TukmokTrunkComponent {}

export const TukmokTrunkComponentArray = new ServerComponentArray<TukmokTrunkComponent, TukmokTrunkComponentParams, IntermediateInfo>(ServerComponentType.tukmokTrunk, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): TukmokTrunkComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   for (let i = 0; i < transformComponentParams.hitboxes.length; i++) {
      const hitbox = transformComponentParams.hitboxes[i];

      const textureSource = hitbox.flags.includes(HitboxFlag.TUKMOK_TRUNK_HEAD) ? "entities/tukmok-trunk/head-segment.png" : "entities/tukmok-trunk/middle-segment.png";
      
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

function createComponent(): TukmokTrunkComponent {
   return {};
}

function getMaxRenderParts(): number {
   // @HACK cuz we can't access the num segments constant defined in the server
   return 8;
}

function padData(): void {}

function updateFromData(): void {}