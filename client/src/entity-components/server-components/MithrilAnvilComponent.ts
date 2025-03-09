import { ServerComponentType } from "../../../../shared/src/components";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface MithrilAnvilComponentParams {}

interface IntermediateInfo {}

export interface MithrilAnvilComponent {}

export const MithrilAnvilComponentArray = new ServerComponentArray<MithrilAnvilComponent, MithrilAnvilComponentParams, IntermediateInfo>(ServerComponentType.mithrilAnvil, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

const fillParams = (): MithrilAnvilComponentParams => {
   return {};
}

export function createMithrilAnvilComponentParams(): MithrilAnvilComponentParams {
   return fillParams();
}

function createParamsFromData(): MithrilAnvilComponentParams {
   return fillParams();
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/mithril-anvil/mithril-anvil.png")
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
   
   return {};
}

function createComponent(): MithrilAnvilComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}