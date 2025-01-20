import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import VisualRenderPart from "../../render-parts/VisualRenderPart";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { updateLimb_TEMP } from "./InventoryUseComponent";
import { EntityConfig } from "../ComponentArray";
import { LimbConfiguration } from "../../../../shared/src/attack-patterns";

export interface ScrappyComponentParams {}

interface RenderParts {}

export interface ScrappyComponent {}

export const ScrappyComponentArray = new ServerComponentArray<ScrappyComponent, ScrappyComponentParams, RenderParts>(ServerComponentType.scrappy, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): ScrappyComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         // @Copynpaste @Hack
         2,
         0,
         getTextureArrayIndex("entities/scrappy/body.png")
      )
   );

   // @Copynpaste from TribesmanComponent
   // Hands
   const attachPoint = new RenderAttachPoint(
      null,
      1,
      0
   );
   attachPoint.addTag("inventoryUseComponent:attachPoint");
   renderInfo.attachRenderPart(attachPoint);
   
   const handRenderPart = new TexturedRenderPart(
      attachPoint,
      1.2,
      0,
      getTextureArrayIndex("entities/scrappy/hand.png")
   );
   handRenderPart.addTag("inventoryUseComponent:hand");
   renderInfo.attachRenderPart(handRenderPart);

   // @Temporary: so that the hand shows correctly when the player is placing a scrappy
   updateLimb_TEMP(handRenderPart, attachPoint, 20, LimbConfiguration.singleHanded);

   return {};
}

function createComponent(): ScrappyComponent {
   return {};
}

function padData(): void {}
   
function updateFromData(): void {}