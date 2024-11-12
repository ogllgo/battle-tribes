import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface TetheredHitboxComponentParams {}

export interface TetheredHitboxComponent {}

export const TetheredHitboxComponentArray = new ServerComponentArray<TetheredHitboxComponent, TetheredHitboxComponentParams, never>(ServerComponentType.tetheredHitbox, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

export function createTetheredHitboxComponentParams(): TetheredHitboxComponentParams {
   return {};
}

function createParamsFromData(): TetheredHitboxComponentParams {
   return createTetheredHitboxComponentParams();
}

function createComponent(): TetheredHitboxComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}