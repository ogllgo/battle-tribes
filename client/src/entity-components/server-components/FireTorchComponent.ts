import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { createLight, Light } from "../../lights";
import { ItemType } from "../../../../shared/src/items/items";
import { Point, randFloat } from "../../../../shared/src/utils";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import Board from "../../Board";
import { createEmberParticle, createSmokeParticle } from "../../particles";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface FireTorchComponentParams {}

interface IntermediateInfo {
   readonly light: Light;
}

export interface FireTorchComponent {
   readonly light: Light;
}

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

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/fire-torch/fire-torch.png")
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   const light = createLight(new Point(0, 0), 1, 2, 10, 1, 0.6, 0.35);
   entityIntermediateInfo.lights.push({
      light: light,
      attachedRenderPart: renderPart
   });
   return {
      light: light
   };
}

function createComponent(_entityParams: EntityParams, intermediateInfo: IntermediateInfo): FireTorchComponent {
   return {
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
   const hitbox = transformComponent.children[0] as Hitbox;

   if (Board.tickIntervalHasPassed(0.15)) {
      // @Incomplete: not done in the server!
      // const fireTorchComponent = FireTorchComponentArray.getComponent(entity);
      // const torchTrait = ITEM_TRAITS_RECORD[ItemType.fireTorch].torch!;
      // fireTorchComponent.light.radius = torchTrait.lightRadius + randFloat(-7, 7);
   }
   
   // Ember particles
   if (Board.tickIntervalHasPassed(0.08)) {
      let spawnPositionX = hitbox.box.position.x;
      let spawnPositionY = hitbox.box.position.y;

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
      const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
      createSmokeParticle(spawnPositionX, spawnPositionY, 24);
   }
}