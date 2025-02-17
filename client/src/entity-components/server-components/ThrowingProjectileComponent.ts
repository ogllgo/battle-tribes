import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface ThrowingProjectileComponentParams {}

export interface ThrowingProjectileComponent {}

export const ThrowingProjectileComponentArray = new ServerComponentArray<ThrowingProjectileComponent, ThrowingProjectileComponentParams, never>(ServerComponentType.throwingProjectile, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): ThrowingProjectileComponentParams {
   return {};
}

function createComponent(): ThrowingProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(): void {}

function updateFromData(): void {}