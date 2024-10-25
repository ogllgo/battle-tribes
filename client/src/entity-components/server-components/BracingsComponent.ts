import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface BracingsComponentParams {}

export interface BracingsComponent {}

export const BracingsComponentArray = new ServerComponentArray<BracingsComponent, BracingsComponentParams, never>(ServerComponentType.bracings, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onLoad: onLoad,
   padData: padData,
   updateFromData: updateFromData
});

export function createBracingsComponentParams(): BracingsComponentParams {
   return {};
}

function createParamsFromData(): BracingsComponentParams {
   return createBracingsComponentParams();
}

function createComponent(): BracingsComponent {
   return {};
}

function onLoad(entity: EntityID): void {
   const renderInfo = getEntityRenderInfo(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (const hitbox of transformComponent.hitboxes) {
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/bracings/vertical-post.png")
      );

      renderInfo.attachRenderThing(renderPart);
   }
}

function padData(): void {}

function updateFromData(): void {}