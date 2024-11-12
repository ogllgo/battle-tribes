import { ServerComponentType } from "battletribes-shared/components";
import Board from "../../Board";
import { playSound, attachSoundToEntity } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";

export interface BattleaxeProjectileComponentParams {}

export interface BattleaxeProjectileComponent {}

export const BattleaxeProjectileComponentArray = new ServerComponentArray<BattleaxeProjectileComponent, BattleaxeProjectileComponentParams, never>(ServerComponentType.battleaxeProjectile, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onLoad: onLoad,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): BattleaxeProjectileComponentParams {
   return {};
}

function createComponent(): BattleaxeProjectileComponent {
   return {};
}

const playWhoosh = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const soundInfo = playSound("air-whoosh.mp3", 0.25, 1, transformComponent.position);
   attachSoundToEntity(soundInfo.sound, entity);
}

function onLoad(entity: Entity): void {
   playWhoosh(entity);
}

function onTick(entity: Entity): void {
   if (Board.tickIntervalHasPassed(0.25)) {
      playWhoosh(entity);
   }
}

function padData(): void {}

function updateFromData(): void {}