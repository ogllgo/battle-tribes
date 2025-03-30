import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface DustfleaComponentParams {}

interface IntermediateInfo {}

export interface DustfleaComponent {}

export const DustfleaComponentArray = new ServerComponentArray<DustfleaComponent, DustfleaComponentParams, IntermediateInfo>(ServerComponentType.dustflea, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(): DustfleaComponentParams {
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
         getTextureArrayIndex("entities/dustflea/dustflea.png")
      )
   );

   return {};
}

function createComponent(): DustfleaComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}
   
function padData(reader: PacketReader): void {}

function updateFromData(reader: PacketReader): void {}