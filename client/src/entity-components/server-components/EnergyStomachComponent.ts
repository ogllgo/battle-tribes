import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface EnergyStomachComponentParams {}

export interface EnergyStomachComponent {}

export const EnergyStomachComponentArray = new ServerComponentArray<EnergyStomachComponent, EnergyStomachComponentParams, never>(ServerComponentType.energyStomach, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): EnergyStomachComponentParams {
   return {};
}

function createComponent(): EnergyStomachComponentParams {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}
   
function padData(): void {}

function updateFromData(): void {}