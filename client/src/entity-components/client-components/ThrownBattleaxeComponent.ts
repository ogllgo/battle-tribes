import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface ThrownBattleaxeComponentParams {}

interface RenderParts {}

export interface ThrownBattleaxeComponent {}

export const ThrownBattleaxeComponentArray = new ClientComponentArray<ThrownBattleaxeComponent, RenderParts>(ClientComponentType.thrownBattleaxe, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent
});

export function createThrownBattleaxeComponentParams(): ThrownBattleaxeComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
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