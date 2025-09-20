import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { randAngle, randFloat } from "battletribes-shared/utils";
import { createFlyParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface PunjiSticksComponentParams {}

interface IntermediateInfo {}

export interface PunjiSticksComponent {
   ticksSinceLastFly: number;
   ticksSinceLastFlySound: number;
}

export const PunjiSticksComponentArray = new ServerComponentArray<PunjiSticksComponent, PunjiSticksComponentParams, IntermediateInfo>(ServerComponentType.punjiSticks, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

const fillParams = (): PunjiSticksComponentParams => {
   return {};
}

export function createPunjiSticksComponentParams(): PunjiSticksComponentParams {
   return fillParams();
}

function createParamsFromData(): PunjiSticksComponentParams {
   return fillParams();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const isAttachedToWall = entityParams.entityType === EntityType.wallPunjiSticks;
   let textureArrayIndex: number;
   if (isAttachedToWall) {
      textureArrayIndex = getTextureArrayIndex("entities/wall-punji-sticks/wall-punji-sticks.png");
   } else {
      textureArrayIndex = getTextureArrayIndex("entities/floor-punji-sticks/floor-punji-sticks.png");
   }

   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
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

function getMaxRenderParts(): number {
   return 1;
}
   
function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const punjiSticksComponent = PunjiSticksComponentArray.getComponent(entity);

   punjiSticksComponent.ticksSinceLastFly++;
   const flyChance = ((punjiSticksComponent.ticksSinceLastFly * Settings.DELTA_TIME) - 0.25) * 0.2;
   if (Math.random() * Settings.DELTA_TIME < flyChance) {
      const hitbox = transformComponent.hitboxes[0];
      
      const offsetMagnitude = 32 * Math.random();
      const offsetDirection = randAngle();
      const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
      createFlyParticle(x, y);
      punjiSticksComponent.ticksSinceLastFly = 0;
   }

   punjiSticksComponent.ticksSinceLastFlySound++;
   const soundChance = ((punjiSticksComponent.ticksSinceLastFlySound * Settings.DELTA_TIME) - 0.3) * 2;
   if (Math.random() < soundChance * Settings.DELTA_TIME) {
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("flies.mp3", 0.15, randFloat(0.9, 1.1), entity, hitbox, false);
      punjiSticksComponent.ticksSinceLastFlySound = 0;
   }
}

function padData(): void {}

function updateFromData(): void {}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("wooden-spikes-hit.mp3", 0.3, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("wooden-spikes-destroy.mp3", 0.4, 1, entity, hitbox, false);
}