import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import ServerComponentArray from "../ServerComponentArray";

export interface AutomatonAssemblerComponentParams {}

interface RenderParts {}

export interface AutomatonAssemblerComponent {}

export const AutomatonAssemblerComponentArray = new ServerComponentArray<AutomatonAssemblerComponent, AutomatonAssemblerComponentParams, RenderParts>(ServerComponentType.automatonAssembler, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): AutomatonAssemblerComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         2,
         0,
         getTextureArrayIndex("entities/automaton-assembler/automaton-assembler.png")
      )
   );

   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/automaton-assembler/back.png")
      )
   );

   // Gear 1
   const gearRenderPart = new TexturedRenderPart(
      null,
      1,
      Math.PI / 4,
      getTextureArrayIndex("entities/automaton-assembler/gear.png")
   );
   gearRenderPart.offset.y = 28;
   gearRenderPart.offset.x = -64;
   renderInfo.attachRenderPart(gearRenderPart);

   // Gear 2
   const gear2RenderPart = new TexturedRenderPart(
      null,
      1.5,
      Math.PI / 8,
      getTextureArrayIndex("entities/automaton-assembler/gear-2.png")
   );
   gear2RenderPart.offset.y = 28;
   gear2RenderPart.offset.x = -24;
   renderInfo.attachRenderPart(gear2RenderPart);

   // Bottom gear
   const bottomGearRenderPart = new TexturedRenderPart(
      null,
      1,
      -Math.PI / 8,
      getTextureArrayIndex("entities/automaton-assembler/gear.png")
   );
   bottomGearRenderPart.offset.y = -32;
   bottomGearRenderPart.offset.x = 20;
   renderInfo.attachRenderPart(bottomGearRenderPart);

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