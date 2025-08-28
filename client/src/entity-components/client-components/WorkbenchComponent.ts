import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface WorkbenchComponentParams {}

interface IntermediateInfo {}

export interface WorkbenchComponent {}

export const WorkbenchComponentArray = new ClientComponentArray<WorkbenchComponent, IntermediateInfo>(ClientComponentType.workbench, true, {
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts
});

export function createWorkbenchComponentParams(): WorkbenchComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
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