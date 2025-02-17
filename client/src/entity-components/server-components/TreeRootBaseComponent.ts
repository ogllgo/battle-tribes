import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createWoodSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnEntity } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface TreeRootBaseComponentParams {}

interface RenderParts {}

export interface TreeRootBaseComponent {}

export const TreeRootBaseComponentArray = new ServerComponentArray<TreeRootBaseComponent, TreeRootBaseComponentParams, RenderParts>(ServerComponentType.treeRootBase, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): TreeRootBaseComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/tree-root-base/tree-root-base.png")
      )
   );

   return {};
}

function createComponent(): TreeRootBaseComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 6; i++) {
      createWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 16 * Math.random());
   }

   playSoundOnEntity("tree-root-base-hit.mp3", randFloat(0.47, 0.53), randFloat(0.9, 1.1), entity, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 10; i++) {
      createWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 16 * Math.random());
   }

   playSoundOnEntity("tree-root-base-death.mp3", 0.5, 1, entity, false);
}