import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface WorkbenchComponentParams {}

interface RenderParts {}

export interface WorkbenchComponent {}

export const WorkbenchComponentArray = new ClientComponentArray<WorkbenchComponent, RenderParts>(ClientComponentType.workbench, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts
});

export function createWorkbenchComponentParams(): WorkbenchComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/workbench/workbench.png")
      )
   );

   return {};
}

function createComponent(): WorkbenchComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}