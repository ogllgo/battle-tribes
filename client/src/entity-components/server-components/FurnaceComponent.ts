import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { randFloat, angle } from "../../../../shared/src/utils";
import { createEmberParticle, createRockParticle, createRockSpeckParticle, createSmokeParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { TransformComponentArray } from "./TransformComponent";
import Board from "../../Board";
import { CookingComponentArray } from "./CookingComponent";

export interface FurnaceComponentParams {}

interface RenderParts {}

export interface FurnaceComponent {}

const SIZE = 80;

export const FurnaceComponentArray = new ServerComponentArray<FurnaceComponent, FurnaceComponentParams, RenderParts>(ServerComponentType.furnace, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick,
   onHit: onHit,
   onDie: onDie
});

export function createFurnaceComponentParams(): FurnaceComponentParams {
   return {};
}

function createParamsFromData(): FurnaceComponentParams {
   return createFurnaceComponentParams();
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

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}

function onTick(entity: Entity): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   if (cookingComponent.isCooking) {
      const transformComponent = TransformComponentArray.getComponent(entity);

      // Smoke particles
      if (Board.tickIntervalHasPassed(0.17)) {
         const spawnOffsetMagnitude = 20 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createSmokeParticle(spawnPositionX, spawnPositionY, 48);
      }

      // Ember particles
      if (Board.tickIntervalHasPassed(0.05)) {
         let spawnPositionX = transformComponent.position.x - 30 * Math.sin(transformComponent.rotation);
         let spawnPositionY = transformComponent.position.y - 30 * Math.cos(transformComponent.rotation);

         const spawnOffsetMagnitude = 11 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createEmberParticle(spawnPositionX, spawnPositionY, transformComponent.rotation + Math.PI + randFloat(-0.8, 0.8), randFloat(80, 120), 0, 0);
      }
   }
}

function onHit(entity: Entity): void {
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

function onDie(entity: Entity): void {
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