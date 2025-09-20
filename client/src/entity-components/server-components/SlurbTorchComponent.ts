import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { createLight, Light } from "../../lights";
import { ItemType } from "../../../../shared/src/items/items";
import { Point, randAngle, randFloat } from "../../../../shared/src/utils";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import { createSlurbParticle } from "../../particles";
import { Settings } from "../../../../shared/src/settings";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

const enum Vars {
   MIN_PARTICLE_CREATION_INTERVAL_SECONDS = 0.45,
   MAX_PARTICLE_CREATION_INTERVAL_SECONDS = 1.55
}

export interface SlurbTorchComponentParams {}

interface IntermediateInfo {}

export interface SlurbTorchComponent {
   particleCreationTimer: number;
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

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/slurb-torch/slurb-torch.png")
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): SlurbTorchComponent {
   return {
      particleCreationTimer: randFloat(Vars.MIN_PARTICLE_CREATION_INTERVAL_SECONDS, Vars.MAX_PARTICLE_CREATION_INTERVAL_SECONDS)
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
   slurbTorchComponent.particleCreationTimer -= Settings.DELTA_TIME;
   if (slurbTorchComponent.particleCreationTimer <= 0) {
      slurbTorchComponent.particleCreationTimer += randFloat(Vars.MIN_PARTICLE_CREATION_INTERVAL_SECONDS, Vars.MAX_PARTICLE_CREATION_INTERVAL_SECONDS);

      let spawnPositionX = hitbox.box.position.x;
      let spawnPositionY = hitbox.box.position.y;

      const spawnOffsetMagnitude = 7 * Math.random();
      const spawnOffsetDirection = randAngle();
      spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createSlurbParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 120), 0, 0);
   }
}