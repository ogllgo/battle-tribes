import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { attachLightToRenderPart, createLight, Light } from "../../lights";
import { ITEM_TRAITS_RECORD, ItemType } from "../../../../shared/src/items/items";
import { Point, randFloat } from "../../../../shared/src/utils";
import { EntityConfig } from "../ComponentArray";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import Board from "../../Board";
import { createEmberParticle, createSmokeParticle } from "../../particles";

export interface FireTorchComponentParams {}

interface RenderParts {
   readonly light: Light;
}

export interface FireTorchComponent {
   readonly light: Light;
}

export const FireTorchComponentArray = new ServerComponentArray<FireTorchComponent, FireTorchComponentParams, RenderParts>(ServerComponentType.fireTorch, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick
});

export function createFireTorchComponentParams(): FireTorchComponentParams {
   return {};
}

function createParamsFromData(): FireTorchComponentParams {
   return createFireTorchComponentParams();
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<never, never>): RenderParts {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex("entities/fire-torch/fire-torch.png")
   );
   renderInfo.attachRenderPart(renderPart);

   // @HACK: Instead we need to only add the lights to the world if it isn't for ghosts
   let light!: Light;
   if (entityConfig.entity !== 0) {
      const torchTrait = ITEM_TRAITS_RECORD[ItemType.fireTorch].torch!;
      light = createLight(new Point(0, 0), torchTrait.lightIntensity, torchTrait.lightStrength, torchTrait.lightRadius, torchTrait.lightR, torchTrait.lightG, torchTrait.lightB);
      attachLightToRenderPart(light, renderPart, entityConfig.entity, entityConfig.layer);
   }

   return {
      light: light
   };
}

function createComponent(_entityConfig: EntityConfig<never, never>, renderParts: RenderParts): FireTorchComponent {
   return {
      light: renderParts.light
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}

function onTick(entity: Entity): void {
   // @Copynpaste: all of these effects from InventoryUseComponent
   
   const transformComponent = TransformComponentArray.getComponent(entity);

   if (Board.tickIntervalHasPassed(0.15)) {
      const fireTorchComponent = FireTorchComponentArray.getComponent(entity);
      const torchTrait = ITEM_TRAITS_RECORD[ItemType.fireTorch].torch!;
      fireTorchComponent.light.radius = torchTrait.lightRadius + randFloat(-7, 7);
   }
   
   // Ember particles
   if (Board.tickIntervalHasPassed(0.08)) {
      let spawnPositionX = transformComponent.position.x;
      let spawnPositionY = transformComponent.position.y;

      const spawnOffsetMagnitude = 7 * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createEmberParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 120), 0, 0);
   }

   // Smoke particles
   if (Board.tickIntervalHasPassed(0.18)) {
      const spawnOffsetMagnitude = 5 * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
      createSmokeParticle(spawnPositionX, spawnPositionY, 24);
   }
}