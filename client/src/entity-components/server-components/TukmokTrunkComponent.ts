import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface TukmokTrunkComponentParams {}

export interface TukmokTrunkComponent {}

export const TukmokTrunkComponentArray = new ServerComponentArray<TukmokTrunkComponent, TukmokTrunkComponentParams, never>(ServerComponentType.tukmokTrunk, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): TukmokTrunkComponentParams {
   return {};
}

function createComponent(): TukmokTrunkComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(): void {}

function updateFromData(): void {}