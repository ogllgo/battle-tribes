import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createArrowDestroyParticle, createRockParticle, createRockSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface SlingTurretRockComponentParams {}

interface RenderParts {}

export interface SlingTurretRockComponent {}

export const SlingTurretRockComponentArray = new ServerComponentArray<SlingTurretRockComponent, SlingTurretRockComponentParams, RenderParts>(ServerComponentType.slingTurretRock, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onDie: onDie,
   padData: padData,
   updateFromData: updateFromData
});

export function createSlingTurretRockComponentParams(): SlingTurretRockComponentParams {
   return {};
}

function createParamsFromData(): SlingTurretRockComponentParams {
   return createSlingTurretRockComponentParams();
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
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

function getMaxRenderParts(): number {
   return 1;
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Create arrow break particles
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(transformComponent.position.x, transformComponent.position.y, transformComponent.selfVelocity.x, transformComponent.selfVelocity.y);
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

function padData(): void {}

function updateFromData(): void {}