import { ServerComponentType } from "battletribes-shared/components";
import { playSoundOnHitbox, SoundInfo } from "../../sound";
import { Settings } from "battletribes-shared/settings";
import { lerp } from "battletribes-shared/utils";
import { createAcidParticle, createPoisonBubble } from "../../particles";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { TransformComponentArray } from "./TransformComponent";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { Hitbox } from "../../hitboxes";

const enum Vars {
   MAX_RANGE = 55
}

export interface SpitPoisonAreaComponentParams {}

export interface SpitPoisonAreaComponent {
   soundInfo: SoundInfo | null;
}

export const SpitPoisonAreaComponentArray = new ServerComponentArray<SpitPoisonAreaComponent, SpitPoisonAreaComponentParams, never>(ServerComponentType.spitPoisonArea, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onJoin: onJoin,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): SpitPoisonAreaComponentParams {
   return {};
}

function createComponent(): SpitPoisonAreaComponent {
   return {
      soundInfo: null
   };
}

function getMaxRenderParts(): number {
   return 0;
}

// @INCOMPLETE: Won't play when you walk into discovering a previously-offscreen spit poison!
function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   
   const spitPoisonAreaComponent = SpitPoisonAreaComponentArray.getComponent(entity);
   
   spitPoisonAreaComponent.soundInfo = playSoundOnHitbox("acid-burn.mp3", 0.25, 1, entity, hitbox, true);
   // @Temporary @Bug @Hack: FIX
   if (spitPoisonAreaComponent.soundInfo === null) {
      throw new Error();
   }

   spitPoisonAreaComponent.soundInfo.trackSource.loop = true;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const spitPoisonAreaComponent = SpitPoisonAreaComponentArray.getComponent(entity);

   const hitbox = transformComponent.children[0] as Hitbox;
   const box = hitbox.box as CircularBox;
   const range = box.radius;

   if (spitPoisonAreaComponent.soundInfo !== null) {
      spitPoisonAreaComponent.soundInfo.sound.volume = lerp(0.25, 0, 1 - range / Vars.MAX_RANGE);
   }

   if (Vars.MAX_RANGE * Math.random() < range) {
      // Calculate spawn position
      const offsetMagnitude = range * Math.random();
      const moveDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = hitbox.box.position.x + offsetMagnitude * Math.sin(moveDirection);
      const spawnPositionY = hitbox.box.position.y + offsetMagnitude * Math.cos(moveDirection);

      createPoisonBubble(spawnPositionX, spawnPositionY, 1);
   }

   if (Math.random() >= range * range / Settings.TPS / 5) {
      return;
   }

   const offsetMagnitude = range * Math.random();
   const offsetDirection = 2 * Math.PI * Math.random();
   const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);

   createAcidParticle(x, y);
}

function padData(): void {}

function updateFromData(): void {}