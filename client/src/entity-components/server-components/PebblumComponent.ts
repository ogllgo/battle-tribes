import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface PebblumComponentParams {}

export interface PebblumComponent {}

export const PebblumComponentArray = new ServerComponentArray<PebblumComponent, PebblumComponentParams, never>(ServerComponentType.pebblum, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): PebblumComponentParams {
   return {};
}

function createComponent(): PebblumComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}