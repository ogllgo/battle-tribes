import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { updateLimb_TEMP } from "./InventoryUseComponent";
import { LimbConfiguration } from "../../../../shared/src/attack-patterns";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface ScrappyComponentParams {}

interface IntermediateInfo {}

export interface ScrappyComponent {}

export const ScrappyComponentArray = new ServerComponentArray<ScrappyComponent, ScrappyComponentParams, IntermediateInfo>(ServerComponentType.scrappy, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): ScrappyComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         // @Copynpaste @Hack
         2,
         0,
         getTextureArrayIndex("entities/scrappy/body.png")
      )
   );

   // @Copynpaste from TribesmanComponent
   // Hands
   const attachPoint = new RenderAttachPoint(
      hitbox,
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

function getMaxRenderParts(): number {
   return 3;
}

function padData(): void {}
   
function updateFromData(): void {}