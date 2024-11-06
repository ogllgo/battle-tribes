import { EntityID } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { PhysicsComponentArray } from "../server-components/PhysicsComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface WoodenArrowComponentParams {}

interface RenderParts {}

export interface WoodenArrowComponent {}

export const WoodenArrowComponentArray = new ClientComponentArray<WoodenArrowComponent, RenderParts>(ClientComponentType.lilypad, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent
});

export function createWoodenArrowComponentParams(): WoodenArrowComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("projectiles/wooden-arrow.png")
      )
   );

   return {};
}

function createComponent(): WoodenArrowComponent {
   return {};
}

function onDie(entity: EntityID): void {
   // Create arrow break particles
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(transformComponent.position.x, transformComponent.position.y, physicsComponent.selfVelocity.x, physicsComponent.selfVelocity.y);
   }
}