import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { entityChildIsHitbox } from "./TransformComponent";

export interface TukmokTailComponentParams {}

interface IntermediateInfo {}

export interface TukmokTailComponent {}

export const TukmokTailComponentArray = new ServerComponentArray<TukmokTailComponent, TukmokTailComponentParams, IntermediateInfo>(ServerComponentType.tukmokTail, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): TukmokTailComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   for (let i = 0; i < transformComponentParams.children.length; i++) {
      const hitbox = transformComponentParams.children[i];
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      renderInfo.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            i * 0.02,
            0,
            getTextureArrayIndex("entities/tukmok-tail/middle-segment.png")
         )
      );
   }

   return {};
}

function createComponent(): TukmokTailComponent {
   return {};
}

function getMaxRenderParts(): number {
   // @HACK cuz we can't access the num segments constant defined in the server
   return 1;
}

function padData(): void {}

function updateFromData(): void {}