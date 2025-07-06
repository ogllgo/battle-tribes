import { ServerComponentType } from "../../../../shared/src/components";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface SnobeMoundComponentParams {}

interface IntermediateInfo {}

export interface SnobeMoundComponent {}

export const SnobeMoundComponentArray = new ServerComponentArray<SnobeMoundComponent, SnobeMoundComponentParams, IntermediateInfo>(ServerComponentType.snobeMound, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
})

function createParamsFromData(): SnobeMoundComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         1,
         0,
         getTextureArrayIndex("entities/snobe-mound/snobe-mound.png")
      )
   );

   return {};
}

function createComponent(): SnobeMoundComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}
   
function padData(): void {}

function updateFromData(): void {}