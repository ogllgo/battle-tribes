import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface TukmokTailClubComponentParams {}

interface IntermediateInfo {}

export interface TukmokTailClubComponent {}

export const TukmokTailClubComponentArray = new ServerComponentArray<TukmokTailClubComponent, TukmokTailClubComponentParams, IntermediateInfo>(ServerComponentType.tukmokTailClub, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): TukmokTailClubComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/tukmok-tail-club/club-segment.png")
      )
   );

   return {};
}

function createComponent(): TukmokTailClubComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}