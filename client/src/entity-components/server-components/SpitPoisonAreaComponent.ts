import { ServerComponentType } from "battletribes-shared/components";
import { playSound, Sound } from "../../sound";
import { Settings } from "battletribes-shared/settings";
import { lerp } from "battletribes-shared/utils";
import { createAcidParticle, createPoisonBubble } from "../../particles";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { TransformComponentArray } from "./TransformComponent";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { EntityConfig } from "../ComponentArray";

const enum Vars {
   MAX_RANGE = 55
}

export interface SpitPoisonAreaComponentParams {}

export interface SpitPoisonAreaComponent {
   readonly trackSource: AudioBufferSourceNode;
   readonly sound: Sound;
}

export const SpitPoisonAreaComponentArray = new ServerComponentArray<SpitPoisonAreaComponent, SpitPoisonAreaComponentParams, never>(ServerComponentType.spitPoisonArea, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onTick: onTick,
   onRemove: onRemove,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): SpitPoisonAreaComponentParams {
   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.transform, never>): SpitPoisonAreaComponent {
   const transformComponentParams = entityConfig.serverComponents[ServerComponentType.transform];

   const audioInfo = playSound("acid-burn.mp3", 0.25, 1, transformComponentParams.position);
   const trackSource = audioInfo.trackSource;
   const sound = audioInfo.sound;

   trackSource.loop = true;

   return {
      trackSource: trackSource,
      sound: sound
   };
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const spitPoisonAreaComponent = SpitPoisonAreaComponentArray.getComponent(entity);

   const hitbox = transformComponent.hitboxes[0];
   const box = hitbox.box as CircularBox;
   const range = box.radius;

   spitPoisonAreaComponent.sound.volume = lerp(0.25, 0, 1 - range / Vars.MAX_RANGE);

   if (Vars.MAX_RANGE * Math.random() < range) {
      // Calculate spawn position
      const offsetMagnitude = range * Math.random();
      const moveDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(moveDirection);
      const spawnPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(moveDirection);

      createPoisonBubble(spawnPositionX, spawnPositionY, 1);
   }

   if (Math.random() >= range * range / Settings.TPS / 5) {
      return;
   }

   const offsetMagnitude = range * Math.random();
   const offsetDirection = 2 * Math.PI * Math.random();
   const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);

   createAcidParticle(x, y);
}

function onRemove(entity: Entity): void {
   const spitPoisonAreaComponent = SpitPoisonAreaComponentArray.getComponent(entity);
   spitPoisonAreaComponent.trackSource.disconnect();
}

function padData(): void {}

function updateFromData(): void {}