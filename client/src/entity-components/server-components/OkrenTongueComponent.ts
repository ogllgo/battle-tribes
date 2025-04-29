import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface OkrenTongueComponentParams {}

export interface OkrenTongueComponent {}

export const OkrenTongueComponentArray = new ServerComponentArray<OkrenTongueComponent, OkrenTongueComponentParams, never>(ServerComponentType.okrenTongue, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

export function createOkrenTongueComponentParams(): OkrenTongueComponentParams {
   return {};
}

function createParamsFromData(): OkrenTongueComponentParams {
   return createOkrenTongueComponentParams();
}

function createComponent(): OkrenTongueComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(): void {}

function updateFromData(): void {}