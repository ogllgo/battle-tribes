import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound, playSoundOnEntity } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityLayer } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { PhysicsComponentArray } from "../server-components/PhysicsComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface BallistaFrostcicleComponentParams {}

interface RenderParts {}

export interface BallistaFrostcicleComponent {}

export const BallistaFrostcicleComponentArray = new ClientComponentArray<BallistaFrostcicleComponent, RenderParts>(ClientComponentType.ballistaFrostcicle, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onDie: onDie
});

export function createBallistaFrostcicleComponentParams(): BallistaFrostcicleComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("projectiles/ballista-frostcicle.png")
      )
   );

   return {};
}

function createComponent(): BallistaFrostcicleComponent {
   return {};
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Create arrow break particles
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(transformComponent.position.x, transformComponent.position.y, transformComponent.selfVelocity.x, transformComponent.selfVelocity.y);
   }

   playSoundOnEntity("ice-break.mp3", 0.4, 1, entity, false);
}