import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface AutoSpawnedComponentParams {}

export interface AutoSpawnedComponent {}

export const AutoSpawnedComponentArray = new ServerComponentArray<AutoSpawnedComponent, AutoSpawnedComponentParams>(ServerComponentType.autoSpawned, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): AutoSpawnedComponentParams {
   return {};
}

function createComponent(): AutoSpawnedComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}