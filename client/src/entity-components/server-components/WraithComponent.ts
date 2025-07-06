import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../../shared/src/components";
import { Point } from "../../../../shared/src/utils";
import { createLight } from "../../lights";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { entityChildIsHitbox } from "./TransformComponent";

export interface WraithComponentParams {}

interface IntermediateInfo {}

export interface WraithComponent {}

export const WraithComponentArray = new ServerComponentArray<WraithComponent, WraithComponentParams, IntermediateInfo>(ServerComponentType.wraith, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(): WraithComponentParams {
   return {};
}

function populateIntermediateInfo(intermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   let headRenderPart!: TexturedRenderPart;
   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      if (hitbox.flags.includes(HitboxFlag.WRAITH_BODY)) {
         intermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               0,
               0,
               getTextureArrayIndex("entities/wraith/body.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.WRAITH_HEAD)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            1,
            0,
            getTextureArrayIndex("entities/wraith/head.png")
         );
         renderPart.addTag("tamingComponent:head")
         intermediateInfo.renderInfo.attachRenderPart(renderPart);

         headRenderPart = renderPart;
      } else if (hitbox.flags.includes(HitboxFlag.WRAITH_EAR)) {
         intermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               2,
               0,
               getTextureArrayIndex("entities/wraith/ear.png")
            )
         );
      }
   }

   for (let i = 0; i < 2; i++) {
      const mult = (i === 0 ? 1 : -1);
      
      const light = createLight(
         new Point(12 * mult, 4),
         0.35,
         0.2,
         2,
         33/255,
         225/255,
         255/255
      );
      intermediateInfo.lights.push({
         light: light,
         attachedRenderPart: headRenderPart
      })
   }

   return {};
}

function createComponent(): WraithComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 4;
}

function padData(): void {}

function updateFromData(): void {}