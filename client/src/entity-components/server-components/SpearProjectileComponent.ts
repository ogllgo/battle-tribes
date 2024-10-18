import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { playSound } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface SpearProjectileComponentParams {}

export interface SpearProjectileComponent {}

export const SpearProjectileComponentArray = new ServerComponentArray<SpearProjectileComponent, SpearProjectileComponentParams, never>(ServerComponentType.spearProjectile, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onSpawn: onSpawn,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): SpearProjectileComponentParams {
   return {};
}

function createComponent(): SpearProjectileComponent {
   return {};
}

function onSpawn(_spearProjectileComponent: SpearProjectileComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("spear-throw.mp3", 0.4, 1, transformComponent.position);
}

function padData(): void {}

function updateFromData(): void {}