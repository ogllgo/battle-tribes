import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface SnowberryBushDeadComponentParams {}

interface IntermediateInfo {}

export interface SnowberryBushDeadComponent {}

export const SnowberryBushDeadComponentArray = new ServerComponentArray<SnowberryBushDeadComponent, SnowberryBushDeadComponentParams, IntermediateInfo>(ServerComponentType.snowberryBushDead, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(): SnowberryBushDeadComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/snowberry-bush-dead/snowberry-bush-dead.png")
      )
   );

   return {};
}

function createComponent(): SnowberryBushDeadComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}
   
function padData(): void {}

function updateFromData(): void {}