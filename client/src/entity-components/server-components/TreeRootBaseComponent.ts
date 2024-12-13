import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import ServerComponentArray from "../ServerComponentArray";

export interface TreeRootBaseComponentParams {}

interface RenderParts {}

export interface TreeRootBaseComponent {}

export const TreeRootBaseComponentArray = new ServerComponentArray<TreeRootBaseComponent, TreeRootBaseComponentParams, RenderParts>(ServerComponentType.treeRootBase, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(): TreeRootBaseComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/tree-root-base/tree-root-base.png")
      )
   );

   return {};
}

function createComponent(): TreeRootBaseComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}