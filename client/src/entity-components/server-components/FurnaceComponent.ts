import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { randFloat, angle, randAngle } from "../../../../shared/src/utils";
import { createEmberParticle, createRockParticle, createRockSpeckParticle, createSmokeParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { TransformComponentArray } from "./TransformComponent";
import Board from "../../Board";
import { CookingComponentArray } from "./CookingComponent";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface FurnaceComponentParams {}

interface IntermediateInfo {}

export interface FurnaceComponent {}

const SIZE = 80;

export const FurnaceComponentArray = new ServerComponentArray<FurnaceComponent, FurnaceComponentParams, IntermediateInfo>(ServerComponentType.furnace, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick,
   onHit: onHit,
   onDie: onDie
});

const fillParams = (): FurnaceComponentParams => {
   return {};
}

export function createFurnaceComponentParams(): FurnaceComponentParams {
   return fillParams();
}

function createParamsFromData(): FurnaceComponentParams {
   return fillParams();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
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
      const hitbox = transformComponent.hitboxes[0];

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
         let spawnPositionX = hitbox.box.position.x - 30 * Math.sin(hitbox.box.angle);
         let spawnPositionY = hitbox.box.position.y - 30 * Math.cos(hitbox.box.angle);

         const spawnOffsetMagnitude = 11 * Math.random();
         const spawnOffsetDirection = randAngle();
         spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createEmberParticle(spawnPositionX, spawnPositionY, hitbox.box.angle + Math.PI + randFloat(-0.8, 0.8), randFloat(80, 120), 0, 0);
      }
   }
}

function onHit(_entity: Entity, hitbox: Hitbox): void {
   for (let i = 0; i < 2; i++) {
      let spawnPositionX: number;
      let spawnPositionY: number;
      if (Math.random() < 0.5) {
         spawnPositionX = hitbox.box.position.x + (Math.random() < 0.5 ? -0.5 : 0.5) * SIZE;
         spawnPositionY = hitbox.box.position.y + randFloat(-0.5, 0.5) * SIZE;
      } else {
         spawnPositionX = hitbox.box.position.x + randFloat(-0.5, 0.5) * SIZE;
         spawnPositionY = hitbox.box.position.y + (Math.random() < 0.5 ? -0.5 : 0.5) * SIZE;
      }

      let moveDirection = angle(spawnPositionX - hitbox.box.position.x, spawnPositionY - hitbox.box.position.y)
      moveDirection += randFloat(-1, 1);

      createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      createRockSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, SIZE / 2, 0, 0, ParticleRenderLayer.low);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   for (let i = 0; i < 5; i++) {
      const spawnPositionX = hitbox.box.position.x + randFloat(-0.5, 0.5) * SIZE;
      const spawnPositionY = hitbox.box.position.y + randFloat(-0.5, 0.5) * SIZE;

      createRockParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      createRockSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, SIZE / 2, 0, 0, ParticleRenderLayer.low);
   }
}