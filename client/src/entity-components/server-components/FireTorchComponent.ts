import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { randAngle, randFloat } from "../../../../shared/src/utils";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import Board from "../../Board";
import { createEmberParticle, createSmokeParticle } from "../../particles";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface FireTorchComponentParams {}

interface IntermediateInfo {}

export interface FireTorchComponent {}

export const FireTorchComponentArray = new ServerComponentArray<FireTorchComponent, FireTorchComponentParams, IntermediateInfo>(ServerComponentType.fireTorch, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick
});

const fillParams = (): FireTorchComponentParams => {
   return {};
}

export function createFireTorchComponentParams(): FireTorchComponentParams {
   return fillParams();
}

function createParamsFromData(): FireTorchComponentParams {
   return fillParams();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/fire-torch/fire-torch.png")
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): FireTorchComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}

function onTick(entity: Entity): void {
   // @Copynpaste: all of these effects from InventoryUseComponent
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   // Ember particles
   if (Board.tickIntervalHasPassed(0.08)) {
      let spawnPositionX = hitbox.box.position.x;
      let spawnPositionY = hitbox.box.position.y;

      const spawnOffsetMagnitude = 7 * Math.random();
      const spawnOffsetDirection = randAngle();
      spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createEmberParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 120), 0, 0);
   }

   // Smoke particles
   if (Board.tickIntervalHasPassed(0.18)) {
      const spawnOffsetMagnitude = 5 * Math.random();
      const spawnOffsetDirection = randAngle();
      const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
      createSmokeParticle(spawnPositionX, spawnPositionY, 24);
   }
}