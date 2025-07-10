import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface StonecarvingTableComponentParams {}

interface IntermediateInfo {}

export interface StonecarvingTableComponent {}

export const StonecarvingTableComponentArray = new ClientComponentArray<StonecarvingTableComponent, IntermediateInfo>(ClientComponentType.stonecarvingTable, true, {
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts
});

export function createStonecarvingTableComponentParams(): StonecarvingTableComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponent = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponent.children[0] as Hitbox;
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
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

function getMaxRenderParts(): number {
   return 1;
}