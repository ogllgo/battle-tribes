import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { LimbConfiguration } from "../../../../shared/src/attack-patterns";
import { updateLimb_TEMP } from "./InventoryUseComponent";

export interface CogwalkerComponentParams {}

interface RenderParts {}

export interface CogwalkerComponent {}

export const CogwalkerComponentArray = new ServerComponentArray<CogwalkerComponent, CogwalkerComponentParams, RenderParts>(ServerComponentType.cogwalker, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): CogwalkerComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         // @Copynpaste @Hack
         2,
         0,
         getTextureArrayIndex("entities/cogwalker/body.png")
      )
   );

   // @Copynpaste from TribesmanComponent
   // Hands
   for (let i = 0; i < 2; i++) {
      const attachPoint = new RenderAttachPoint(
         null,
         1,
         0
      );
      if (i === 1) {
         attachPoint.setFlipX(true);
      }
      attachPoint.addTag("inventoryUseComponent:attachPoint");
      renderInfo.attachRenderPart(attachPoint);
      
      const handRenderPart = new TexturedRenderPart(
         attachPoint,
         1.2,
         0,
         getTextureArrayIndex("entities/cogwalker/hand.png")
      );
      handRenderPart.addTag("inventoryUseComponent:hand");
      renderInfo.attachRenderPart(handRenderPart);

      // @Temporary: so that the hand shows correctly when the player is placing a cogwalker
      updateLimb_TEMP(handRenderPart, attachPoint, 28, LimbConfiguration.twoHanded);
   }

   return {};
}

function createComponent(): CogwalkerComponent {
   return {};
}

function padData(): void {}
   
function updateFromData(): void {}