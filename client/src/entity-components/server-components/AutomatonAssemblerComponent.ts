import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface AutomatonAssemblerComponentParams {}

interface IntermediateInfo {}

export interface AutomatonAssemblerComponent {}

export const AutomatonAssemblerComponentArray = new ServerComponentArray<AutomatonAssemblerComponent, AutomatonAssemblerComponentParams, IntermediateInfo>(ServerComponentType.automatonAssembler, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (): AutomatonAssemblerComponentParams => {
   return {};
}

export function createAutomatonAssemblerComponentParams(): AutomatonAssemblerComponentParams {
   return fillParams();
}

function createParamsFromData(): AutomatonAssemblerComponentParams {
   return fillParams();
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         2,
         0,
         getTextureArrayIndex("entities/automaton-assembler/automaton-assembler.png")
      )
   );

   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/automaton-assembler/back.png")
      )
   );

   // Gear 1
   const gearRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      Math.PI / 4,
      getTextureArrayIndex("entities/automaton-assembler/gear.png")
   );
   gearRenderPart.offset.y = 28;
   gearRenderPart.offset.x = -64;
   entityIntermediateInfo.renderInfo.attachRenderPart(gearRenderPart);

   // Gear 2
   const gear2RenderPart = new TexturedRenderPart(
      hitbox,
      1.5,
      Math.PI / 8,
      getTextureArrayIndex("entities/automaton-assembler/gear-2.png")
   );
   gear2RenderPart.offset.y = 28;
   gear2RenderPart.offset.x = -24;
   entityIntermediateInfo.renderInfo.attachRenderPart(gear2RenderPart);

   // Bottom gear
   const bottomGearRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      -Math.PI / 8,
      getTextureArrayIndex("entities/automaton-assembler/gear.png")
   );
   bottomGearRenderPart.offset.y = -32;
   bottomGearRenderPart.offset.x = 20;
   entityIntermediateInfo.renderInfo.attachRenderPart(bottomGearRenderPart);

   return {};
}

function createComponent(): AutomatonAssemblerComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 5;
}

function padData(): void {}

function updateFromData(): void {}