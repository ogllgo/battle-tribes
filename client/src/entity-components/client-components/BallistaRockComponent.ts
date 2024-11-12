import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { PhysicsComponentArray } from "../server-components/PhysicsComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface BallistaRockComponentParams {}

interface RenderParts {}

export interface BallistaRockComponent {}

export const BallistaRockComponentArray = new ClientComponentArray<BallistaRockComponent, RenderParts>(ClientComponentType.ballistaRock, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onDie: onDie
});

export function createBallistaRockComponentParams(): BallistaRockComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("projectiles/ballista-rock.png")
      )
   );

   return {};
}

function createComponent(): BallistaRockComponent {
   return {};
}

function onDie(entity: Entity): void {
   // Create arrow break particles
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(transformComponent.position.x, transformComponent.position.y, physicsComponent.selfVelocity.x, physicsComponent.selfVelocity.y);
   }
}