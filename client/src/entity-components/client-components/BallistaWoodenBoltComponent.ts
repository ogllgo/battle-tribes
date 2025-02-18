import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { PhysicsComponentArray } from "../server-components/PhysicsComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface BallistaWoodenBoltComponentParams {}

interface RenderParts {}

export interface BallistaWoodenBoltComponent {}

export const BallistaWoodenBoltComponentArray = new ClientComponentArray<BallistaWoodenBoltComponent, RenderParts>(ClientComponentType.ballistaWoodenBolt, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onDie: onDie
});

export function createBallistaWoodenBoltComponentParams(): BallistaWoodenBoltComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("projectiles/wooden-bolt.png")
      )
   );

   return {};
}

function createComponent(): BallistaWoodenBoltComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onDie(entity: Entity): void {
   // Create arrow break particles
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(transformComponent.position.x, transformComponent.position.y, transformComponent.selfVelocity.x, transformComponent.selfVelocity.y);
   }
}