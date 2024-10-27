import { ServerComponentType } from "../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";

export interface BracingsComponentParams {}

interface RenderParts {}

export interface BracingsComponent {}

export const BracingsComponentArray = new ServerComponentArray<BracingsComponent, BracingsComponentParams, RenderParts>(ServerComponentType.bracings, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

export function createBracingsComponentParams(): BracingsComponentParams {
   return {};
}

function createParamsFromData(): BracingsComponentParams {
   return createBracingsComponentParams();
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.transform, never>): RenderParts {
   const transformComponentParams = entityConfig.serverComponents[ServerComponentType.transform];

   // Vertical posts
   for (const hitbox of transformComponentParams.hitboxes) {
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/bracings/wooden-vertical-post.png")
      );

      renderInfo.attachRenderThing(renderPart);
   }

   // Horizontal bar connecting the vertical ones
   const rotation = transformComponentParams.hitboxes[0].box.offset.calculateAngleBetween(transformComponentParams.hitboxes[1].box.offset);
   const horizontalBar = new TexturedRenderPart(
      null,
      1,
      rotation,
      getTextureArrayIndex("entities/bracings/wooden-horizontal-post.png")
   );
   horizontalBar.opacity = 0.5;
   renderInfo.attachRenderThing(horizontalBar);

   return {};
}

function createComponent(): BracingsComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}