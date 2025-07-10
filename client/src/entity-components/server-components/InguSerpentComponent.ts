import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { entityChildIsHitbox } from "./TransformComponent";

export interface InguSerpentComponentParams {}

interface IntermediateInfo {}

export interface InguSerpentComponent {}

export const InguSerpentComponentArray = new ServerComponentArray<InguSerpentComponent, InguSerpentComponentParams, IntermediateInfo>(ServerComponentType.inguSerpent, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(): InguSerpentComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   let headRenderPart!: TexturedRenderPart;
   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      if (hitbox.flags.includes(HitboxFlag.INGU_SERPENT_HEAD)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               0,
               0,
               getTextureArrayIndex("entities/ingu-serpent/head.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.INGU_SERPENT_BODY_1)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            1,
            0,
            getTextureArrayIndex("entities/ingu-serpent/body-1.png")
         );
         renderPart.addTag("tamingComponent:head")
         renderInfo.attachRenderPart(renderPart);

         headRenderPart = renderPart;
      } else if (hitbox.flags.includes(HitboxFlag.INGU_SERPENT_BODY_2)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               2,
               0,
               getTextureArrayIndex("entities/ingu-serpent/body-2.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.INGU_SERPENT_TAIL)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               3,
               0,
               getTextureArrayIndex("entities/ingu-serpent/tail.png")
            )
         );
      }
   }

   // @Incomplete
   // for (let i = 0; i < 2; i++) {
   //    const mult = (i === 0 ? 1 : -1);
      
   //    const light = createLight(
   //       new Point(12 * mult, 2),
   //       0.55,
   //       0.1,
   //       2,
   //       33/255,
   //       225/255,
   //       255/255
   //    );
   //    intermediateInfo.lights.push({
   //       light: light,
   //       attachedRenderPart: headRenderPart
   //    });
   // }

   return {};
}

function createComponent(): InguSerpentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 4;
}

function padData(): void {}

function updateFromData(): void {}