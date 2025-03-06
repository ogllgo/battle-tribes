import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { createLight, Light } from "../../lights";
import { ITEM_TRAITS_RECORD, ItemType } from "../../../../shared/src/items/items";
import { Point, randFloat } from "../../../../shared/src/utils";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import { createSlurbParticle } from "../../particles";
import { Settings } from "../../../../shared/src/settings";
import { EntityIntermediateInfo, EntityParams } from "../../world";

const enum Vars {
   MIN_PARTICLE_CREATION_INTERVAL_SECONDS = 0.45,
   MAX_PARTICLE_CREATION_INTERVAL_SECONDS = 1.55
}

export interface SlurbTorchComponentParams {}

interface IntermediateInfo {
   readonly light: Light;
}

export interface SlurbTorchComponent {
   particleCreationTimer: number;
   readonly light: Light;
}

export const SlurbTorchComponentArray = new ServerComponentArray<SlurbTorchComponent, SlurbTorchComponentParams, IntermediateInfo>(ServerComponentType.slurbTorch, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick
});

const fillParams = (): SlurbTorchComponentParams => {
   return {};
}

export function createSlurbTorchComponentParams(): SlurbTorchComponentParams {
   return fillParams();
}

function createParamsFromData(): SlurbTorchComponentParams {
   return fillParams();
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/slurb-torch/slurb-torch.png")
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   const torchTrait = ITEM_TRAITS_RECORD[ItemType.slurbTorch].torch!;
   const light = createLight(new Point(0, 0), torchTrait.lightIntensity, torchTrait.lightStrength, torchTrait.lightRadius, torchTrait.lightR, torchTrait.lightG, torchTrait.lightB);
   entityIntermediateInfo.lights.push({
      light: light,
      attachedRenderPart: renderPart
   });

   return {
      light: light
   };
}

function createComponent(_entityParams: EntityParams, intermediateInfo: IntermediateInfo): SlurbTorchComponent {
   return {
      particleCreationTimer: randFloat(Vars.MIN_PARTICLE_CREATION_INTERVAL_SECONDS, Vars.MAX_PARTICLE_CREATION_INTERVAL_SECONDS),
      light: intermediateInfo.light
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
   const hitbox = transformComponent.hitboxes[0];
   
   // Slurb particles
   const slurbTorchComponent = SlurbTorchComponentArray.getComponent(entity);
   slurbTorchComponent.particleCreationTimer -= Settings.I_TPS;
   if (slurbTorchComponent.particleCreationTimer <= 0) {
      slurbTorchComponent.particleCreationTimer += randFloat(Vars.MIN_PARTICLE_CREATION_INTERVAL_SECONDS, Vars.MAX_PARTICLE_CREATION_INTERVAL_SECONDS);

      let spawnPositionX = hitbox.box.position.x;
      let spawnPositionY = hitbox.box.position.y;

      const spawnOffsetMagnitude = 7 * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createSlurbParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 120), 0, 0);
   }
}