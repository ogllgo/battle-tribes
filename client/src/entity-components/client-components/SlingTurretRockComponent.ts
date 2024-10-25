import { EntityID } from "../../../../shared/src/entities";
import { randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createArrowDestroyParticle, createRockParticle, createRockSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { PhysicsComponentArray } from "../server-components/PhysicsComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface SlingTurretRockComponentParams {}

interface RenderParts {}

export interface SlingTurretRockComponent {}

export const SlingTurretRockComponentArray = new ClientComponentArray<SlingTurretRockComponent, RenderParts>(ClientComponentType.slingTurretRock, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onDie: onDie
});

export function createSlingTurretRockComponentParams(): SlingTurretRockComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderThing(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("projectiles/sling-rock.png")
      )
   );

   return {};
}

function createComponent(): SlingTurretRockComponent {
   return {};
}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Create arrow break particles
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(transformComponent.position.x, transformComponent.position.y, physicsComponent.selfVelocity.x, physicsComponent.selfVelocity.y);
   }

   for (let i = 0; i < 3; i++) {
      const spawnOffsetMagnitude = 16 * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(60, 100), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      createRockSpeckParticle(transformComponent.position.x, transformComponent.position.y, 16, 0, 0, ParticleRenderLayer.low);
   }
}