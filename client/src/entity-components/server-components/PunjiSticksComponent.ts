import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { randFloat } from "battletribes-shared/utils";
import { createFlyParticle } from "../../particles";
import { playSoundOnEntity } from "../../sound";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";

export interface PunjiSticksComponentParams {}

interface RenderParts {}

export interface PunjiSticksComponent {
   ticksSinceLastFly: number;
   ticksSinceLastFlySound: number;
}

export const PunjiSticksComponentArray = new ServerComponentArray<PunjiSticksComponent, PunjiSticksComponentParams, RenderParts>(ServerComponentType.punjiSticks, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): PunjiSticksComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<never, never>): RenderParts {
   const isAttachedToWall = entityConfig.entityType === EntityType.wallPunjiSticks;
   let textureArrayIndex: number;
   if (isAttachedToWall) {
      textureArrayIndex = getTextureArrayIndex("entities/wall-punji-sticks/wall-punji-sticks.png");
   } else {
      textureArrayIndex = getTextureArrayIndex("entities/floor-punji-sticks/floor-punji-sticks.png");
   }

   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      textureArrayIndex
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): PunjiSticksComponent {
   return {
      ticksSinceLastFly: 0,
      ticksSinceLastFlySound: 0
   };
}
   
function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const punjiSticksComponent = PunjiSticksComponentArray.getComponent(entity);

   punjiSticksComponent.ticksSinceLastFly++;
   const flyChance = ((punjiSticksComponent.ticksSinceLastFly / Settings.TPS) - 0.25) * 0.2;
   if (Math.random() / Settings.TPS < flyChance) {
      const offsetMagnitude = 32 * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
      createFlyParticle(x, y);
      punjiSticksComponent.ticksSinceLastFly = 0;
   }

   punjiSticksComponent.ticksSinceLastFlySound++;
   const soundChance = ((punjiSticksComponent.ticksSinceLastFlySound / Settings.TPS) - 0.3) * 2;
   if (Math.random() < soundChance / Settings.TPS) {
      playSoundOnEntity("flies.mp3", 0.15, randFloat(0.9, 1.1), entity);
      punjiSticksComponent.ticksSinceLastFlySound = 0;
   }
}

function padData(): void {}

function updateFromData(): void {}

function onHit(entity: Entity): void {
   playSoundOnEntity("wooden-spikes-hit.mp3", 0.3, 1, entity);
}

function onDie(entity: Entity): void {
   playSoundOnEntity("wooden-spikes-destroy.mp3", 0.4, 1, entity);
}