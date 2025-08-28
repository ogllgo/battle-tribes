import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { randAngle } from "../../../../shared/src/utils";

export interface DustfleaEggComponentParams {}

interface IntermediateInfo {}

export interface DustfleaEggComponent {}

export const DustfleaEggComponentArray = new ServerComponentArray<DustfleaEggComponent, DustfleaEggComponentParams, IntermediateInfo>(ServerComponentType.dustfleaEgg, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   const renderPart = new TexturedRenderPart(
      hitbox,
      1,
      0,
      getTextureArrayIndex("entities/dustflea-egg/dustflea-egg.png")
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   const dustfleaRenderPart = new TexturedRenderPart(
      hitbox,
      0,
      randAngle(), // @Sync
      getTextureArrayIndex("entities/dustflea/dustflea.png")
   );
   dustfleaRenderPart.inheritParentRotation = false;
   entityIntermediateInfo.renderInfo.attachRenderPart(dustfleaRenderPart);

   return {};
}

export function createDustfleaEggComponentParams(): DustfleaEggComponentParams {
   return {};
}

function createParamsFromData(): DustfleaEggComponentParams {
   return createDustfleaEggComponentParams();
}

function createComponent(): DustfleaEggComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 2;
}

function padData(): void {}

function updateFromData(): void {}