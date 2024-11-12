import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { randFloat } from "../../../../shared/src/utils";
import Board from "../../Board";
import { createSmokeParticle, createEmberParticle } from "../../particles";
import { CookingComponentArray } from "./CookingComponent";
import { TransformComponentArray } from "./TransformComponent";

export interface CampfireComponentParams {}

interface RenderParts {}

export interface CampfireComponent {}

export const CampfireComponentArray = new ServerComponentArray<CampfireComponent, CampfireComponentParams, RenderParts>(ServerComponentType.campfire, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

export function createCampfireComponentParams(): CampfireComponentParams {
   return {};
}

function createParamsFromData(): CampfireComponentParams {
   return createCampfireComponentParams();
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/campfire/campfire.png")
      )
   );

   return {};
}

function createComponent(): CampfireComponent {
   return {};
}

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
         let spawnPositionX = transformComponent.position.x;
         let spawnPositionY = transformComponent.position.y;

         const spawnOffsetMagnitude = 11 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createEmberParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 120), 0, 0);
      }
   }
}

function padData(): void {}

function updateFromData(): void {}