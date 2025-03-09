import { ServerComponentType } from "../../../../shared/src/components";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { entityChildIsHitbox } from "./TransformComponent";

export interface BracingsComponentParams {}

interface IntermediateInfo {}

export interface BracingsComponent {}

export const BracingsComponentArray = new ServerComponentArray<BracingsComponent, BracingsComponentParams, IntermediateInfo>(ServerComponentType.bracings, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (): BracingsComponentParams => {
   return {};
}

export function createBracingsComponentParams(): BracingsComponentParams {
   return fillParams();
}

function createParamsFromData(): BracingsComponentParams {
   return fillParams();
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   // Vertical posts
   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/bracings/wooden-vertical-post.png")
      );
      renderPart.addTag("bracingsComponent:vertical");
      entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
   }

   const hitbox = transformComponentParams.children[0] as Hitbox;

   // Horizontal bar connecting the vertical ones
   const horizontalBar = new TexturedRenderPart(
      hitbox,
      1,
      0,
      getTextureArrayIndex("entities/bracings/wooden-horizontal-post.png")
   );
   horizontalBar.addTag("bracingsComponent:horizontal");
   horizontalBar.opacity = 0.5;
   entityIntermediateInfo.renderInfo.attachRenderPart(horizontalBar);

   return {};
}

function createComponent(): BracingsComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

function padData(): void {}

function updateFromData(): void {}