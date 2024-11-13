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
import { createSlurbParticle } from "../../particles";
import { Settings } from "../../../../shared/src/settings";

const enum Vars {
   MIN_PARTICLE_CREATION_INTERVAL_SECONDS = 0.35,
   MAX_PARTICLE_CREATION_INTERVAL_SECONDS = 0.85
}

export interface SlurbTorchComponentParams {}

interface RenderParts {
   readonly light: Light;
}

export interface SlurbTorchComponent {
   particleCreationTimer: number;
   readonly light: Light;
}

export const SlurbTorchComponentArray = new ServerComponentArray<SlurbTorchComponent, SlurbTorchComponentParams, RenderParts>(ServerComponentType.slurbTorch, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick
});

export function createSlurbTorchComponentParams(): SlurbTorchComponentParams {
   return {};
}

function createParamsFromData(): SlurbTorchComponentParams {
   return createSlurbTorchComponentParams();
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<never, never>): RenderParts {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex("entities/slurb-torch/slurb-torch.png")
   );
   renderInfo.attachRenderPart(renderPart);

   // @HACK: Instead we need to only add the lights to the world if it isn't for ghosts
   let light!: Light;
   if (entityConfig.entity !== 0) {
      const torchTrait = ITEM_TRAITS_RECORD[ItemType.slurbTorch].torch!;
      light = createLight(new Point(0, 0), torchTrait.lightIntensity, torchTrait.lightStrength, torchTrait.lightRadius, torchTrait.lightR, torchTrait.lightG, torchTrait.lightB);
      attachLightToRenderPart(light, renderPart, entityConfig.entity, entityConfig.layer);
   }

   return {
      light: light
   };
}

function createComponent(_entityConfig: EntityConfig<never, never>, renderParts: RenderParts): SlurbTorchComponent {
   return {
      particleCreationTimer: randFloat(Vars.MIN_PARTICLE_CREATION_INTERVAL_SECONDS, Vars.MAX_PARTICLE_CREATION_INTERVAL_SECONDS),
      light: renderParts.light
   };
}

function padData(): void {}

function updateFromData(): void {}

function onTick(entity: Entity): void {
   // @Copynpaste: all of these effects from InventoryUseComponent
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // Slurb particles
   const slurbTorchComponent = SlurbTorchComponentArray.getComponent(entity);
   slurbTorchComponent.particleCreationTimer -= Settings.I_TPS;
   if (slurbTorchComponent.particleCreationTimer <= 0) {
      slurbTorchComponent.particleCreationTimer += randFloat(Vars.MIN_PARTICLE_CREATION_INTERVAL_SECONDS, Vars.MAX_PARTICLE_CREATION_INTERVAL_SECONDS);

      let spawnPositionX = transformComponent.position.x;
      let spawnPositionY = transformComponent.position.y;

      const spawnOffsetMagnitude = 7 * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createSlurbParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 120), 0, 0);
   }
}