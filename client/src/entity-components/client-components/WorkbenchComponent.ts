import { ServerComponentType } from "../../../../shared/src/components";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
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

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
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