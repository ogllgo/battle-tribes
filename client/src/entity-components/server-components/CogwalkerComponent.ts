import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { LimbConfiguration } from "../../../../shared/src/attack-patterns";
import { updateLimb_TEMP } from "./InventoryUseComponent";
import { EntityIntermediateInfo, EntityParams } from "../../world";

export interface CogwalkerComponentParams {}

interface IntermediateInfo {}

export interface CogwalkerComponent {}

export const CogwalkerComponentArray = new ServerComponentArray<CogwalkerComponent, CogwalkerComponentParams, IntermediateInfo>(ServerComponentType.cogwalker, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): CogwalkerComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
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
         hitbox,
         1,
         0
      );
      if (i === 1) {
         attachPoint.setFlipX(true);
      }
      attachPoint.addTag("inventoryUseComponent:attachPoint");
      entityIntermediateInfo.renderInfo.attachRenderPart(attachPoint);
      
      const handRenderPart = new TexturedRenderPart(
         attachPoint,
         1.2,
         0,
         getTextureArrayIndex("entities/cogwalker/hand.png")
      );
      handRenderPart.addTag("inventoryUseComponent:hand");
      entityIntermediateInfo.renderInfo.attachRenderPart(handRenderPart);

      // @Temporary: so that the hand shows correctly when the player is placing a cogwalker
      updateLimb_TEMP(handRenderPart, attachPoint, 28, LimbConfiguration.twoHanded);
   }

   return {};
}

function createComponent(): CogwalkerComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

function padData(): void {}
   
function updateFromData(): void {}