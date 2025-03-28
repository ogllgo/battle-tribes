import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface EnergyStoreComponentParams {}

export interface EnergyStoreComponent {}

export const EnergyStoreComponentArray = new ServerComponentArray<EnergyStoreComponent, EnergyStoreComponentParams, never>(ServerComponentType.energyStore, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): EnergyStoreComponentParams {
   return {};
}

function createComponent(): EnergyStoreComponentParams {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}
   
function padData(): void {}

function updateFromData(): void {}