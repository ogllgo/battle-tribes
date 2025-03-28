import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface HungerComponentParams {}

export interface HungerComponent {}

export const HungerComponentArray = new ServerComponentArray<HungerComponent, HungerComponentParams, never>(ServerComponentType.hunger, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): HungerComponentParams {
   return {};
}

function createComponent(): HungerComponentParams {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}
   
function padData(): void {}

function updateFromData(): void {}