import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { randInt } from "../../../../shared/src/utils";
import { EntityIntermediateInfo, EntityParams } from "../../world";

export interface SpikyBastardComponentParams {}

interface IntermediateInfo {}

export interface SpikyBastardComponent {}

export const SpikyBastardComponentArray = new ServerComponentArray<SpikyBastardComponent, SpikyBastardComponentParams, IntermediateInfo>(ServerComponentType.spikyBastard, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

export function createSpikyBastardComponentParams(): SpikyBastardComponentParams {
   return {};
}

function createParamsFromData(): SpikyBastardComponentParams {
   return createSpikyBastardComponentParams();
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponent = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponent.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/spiky-bastard/spiky-bastard-" + randInt(1, 3) + ".png")
   );
   if (Math.random() < 0.5) {
      renderPart.setFlipX(true);
   }
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): SpikyBastardComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}