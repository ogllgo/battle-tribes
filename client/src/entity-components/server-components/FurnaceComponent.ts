import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityID } from "../../../../shared/src/entities";
import { randFloat, angle } from "../../../../shared/src/utils";
import { createRockParticle, createRockSpeckParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { TransformComponentArray } from "./TransformComponent";

export interface FurnaceComponentParams {}

interface RenderParts {}

export interface FurnaceComponent {}

const SIZE = 80;

export const FurnaceComponentArray = new ServerComponentArray<FurnaceComponent, FurnaceComponentParams, RenderParts>(ServerComponentType.furnace, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): FurnaceComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/furnace/furnace.png")
      )
   );

   return {};
}

function createComponent(): FurnaceComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}

function onHit(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 2; i++) {
      let spawnPositionX: number;
      let spawnPositionY: number;
      if (Math.random() < 0.5) {
         spawnPositionX = transformComponent.position.x + (Math.random() < 0.5 ? -0.5 : 0.5) * SIZE;
         spawnPositionY = transformComponent.position.y + randFloat(-0.5, 0.5) * SIZE;
      } else {
         spawnPositionX = transformComponent.position.x + randFloat(-0.5, 0.5) * SIZE;
         spawnPositionY = transformComponent.position.y + (Math.random() < 0.5 ? -0.5 : 0.5) * SIZE;
      }

      let moveDirection = angle(spawnPositionX - transformComponent.position.x, spawnPositionY - transformComponent.position.y)
      
      moveDirection += randFloat(-1, 1);

      createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      createRockSpeckParticle(transformComponent.position.x, transformComponent.position.y, SIZE / 2, 0, 0, ParticleRenderLayer.low);
   }
}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 5; i++) {
      const spawnPositionX = transformComponent.position.x + randFloat(-0.5, 0.5) * SIZE;
      const spawnPositionY = transformComponent.position.y + randFloat(-0.5, 0.5) * SIZE;

      createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      createRockSpeckParticle(transformComponent.position.x, transformComponent.position.y, SIZE / 2, 0, 0, ParticleRenderLayer.low);
   }
}