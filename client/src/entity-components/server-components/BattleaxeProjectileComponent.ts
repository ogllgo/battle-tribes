import { ServerComponentType } from "battletribes-shared/components";
import Board from "../../Board";
import { playSoundOnHitbox } from "../../sound";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface BattleaxeProjectileComponentParams {}

export interface BattleaxeProjectileComponent {}

export const BattleaxeProjectileComponentArray = new ServerComponentArray<BattleaxeProjectileComponent, BattleaxeProjectileComponentParams, never>(ServerComponentType.battleaxeProjectile, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
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

function getMaxRenderParts(): number {
   return 0;
}

const playWhoosh = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("air-whoosh.mp3", 0.25, 1, hitbox, true);
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