import { ServerComponentType } from "../../../../shared/src/components";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface LilypadComponentParams {}

interface IntermediateInfo {}

export interface LilypadComponent {}

export const LilypadComponentArray = new ClientComponentArray<LilypadComponent, IntermediateInfo>(ClientComponentType.lilypad, true, {
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts
});

export function createLilypadComponentParams(): LilypadComponentParams {
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
         getTextureArrayIndex("entities/lilypad/lilypad.png")
      )
   );

   return {};
}

function createComponent(): LilypadComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}