import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { randAngle, randFloat } from "../../../../shared/src/utils";
import Board from "../../Board";
import { createSmokeParticle, createEmberParticle } from "../../particles";
import { CookingComponentArray } from "./CookingComponent";
import { TransformComponentArray } from "./TransformComponent";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface CampfireComponentParams {}

interface IntermediateInfo {}

export interface CampfireComponent {}

export const CampfireComponentArray = new ServerComponentArray<CampfireComponent, CampfireComponentParams, IntermediateInfo>(ServerComponentType.campfire, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (): CampfireComponentParams => {
   return {};
}

export function createCampfireComponentParams(): CampfireComponentParams {
   return fillParams();
}

function createParamsFromData(): CampfireComponentParams {
   return fillParams();
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
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

function getMaxRenderParts(): number {
   return 0;
}

function onTick(entity: Entity): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   if (cookingComponent.isCooking) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.children[0] as Hitbox;

      // Smoke particles
      if (Board.tickIntervalHasPassed(0.17)) {
         const spawnOffsetMagnitude = 20 * Math.random();
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createSmokeParticle(spawnPositionX, spawnPositionY, 48);
      }

      // Ember particles
      if (Board.tickIntervalHasPassed(0.05)) {
         let spawnPositionX = hitbox.box.position.x;
         let spawnPositionY = hitbox.box.position.y;

         const spawnOffsetMagnitude = 11 * Math.random();
         const spawnOffsetDirection = randAngle();
         spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createEmberParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 120), 0, 0);
      }
   }
}

function padData(): void {}

function updateFromData(): void {}