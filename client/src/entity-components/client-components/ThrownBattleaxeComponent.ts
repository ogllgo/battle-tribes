import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface ThrownBattleaxeComponentParams {}

interface IntermediateInfo {}

export interface ThrownBattleaxeComponent {}

export const ThrownBattleaxeComponentArray = new ClientComponentArray<ThrownBattleaxeComponent, IntermediateInfo>(ClientComponentType.thrownBattleaxe, true, {
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts
});

export function createThrownBattleaxeComponentParams(): ThrownBattleaxeComponentParams {
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
         getTextureArrayIndex("items/large/stone-battleaxe.png")
      )
   );

   return {};
}

function createComponent(): ThrownBattleaxeComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}