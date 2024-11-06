import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface StonecarvingTableComponentParams {}

interface RenderParts {}

export interface StonecarvingTableComponent {}

export const StonecarvingTableComponentArray = new ClientComponentArray<StonecarvingTableComponent, RenderParts>(ClientComponentType.stonecarvingTable, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent
});

export function createStonecarvingTableComponentParams(): StonecarvingTableComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("entities/stonecarving-table/stonecarving-table.png")
      )
   );

   return {};
}

function createComponent(): StonecarvingTableComponent {
   return {};
}