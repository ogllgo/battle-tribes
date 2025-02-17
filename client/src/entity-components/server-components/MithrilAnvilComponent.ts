import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import ServerComponentArray from "../ServerComponentArray";

export interface MithrilAnvilComponentParams {}

interface RenderParts {}

export interface MithrilAnvilComponent {}

export const MithrilAnvilComponentArray = new ServerComponentArray<MithrilAnvilComponent, MithrilAnvilComponentParams, RenderParts>(ServerComponentType.mithrilAnvil, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(): MithrilAnvilComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex("entities/mithril-anvil/mithril-anvil.png")
   );
   renderInfo.attachRenderPart(renderPart);
   
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