import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { randInt } from "../../../../shared/src/utils";

export interface SpikyBastardComponentParams {}

interface RenderParts {}

export interface SpikyBastardComponent {}

export const SpikyBastardComponentArray = new ServerComponentArray<SpikyBastardComponent, SpikyBastardComponentParams, RenderParts>(ServerComponentType.spikyBastard, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
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

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex("entities/spiky-bastard/spiky-bastard-" + randInt(1, 3) + ".png")
   );
   if (Math.random() < 0.5) {
      renderPart.setFlipX(true);
   }
   renderInfo.attachRenderPart(renderPart);

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