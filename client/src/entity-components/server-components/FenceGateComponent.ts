import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";

export interface FenceGateComponentParams {}

interface IntermediateInfo {}

export interface FenceGateComponent {}

export const FenceGateComponentArray = new ServerComponentArray<FenceGateComponent, FenceGateComponentParams, IntermediateInfo>(ServerComponentType.fenceGate, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

export function createFenceGateComponentParams(): FenceGateComponentParams {
   return {};
}

function createParamsFromData(): FenceGateComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponent = entityParams.serverComponentParams[ServerComponentType.transform]!;
   
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.FENCE_GATE_DOOR)) {
         renderInfo.attachRenderPart(
               new TexturedRenderPart(
               hitbox,
               1,
               0,
               getTextureArrayIndex("entities/fence-gate/door.png")
            )
         );
      } else {
         renderInfo.attachRenderPart(
               new TexturedRenderPart(
               hitbox,
               0,
               0,
               getTextureArrayIndex("entities/fence-gate/side.png")
            )
         );
      }
   }

   return {};
}

function createComponent(): FenceGateComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

function padData(): void {}

function updateFromData(): void {}