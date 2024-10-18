import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface SlimewispComponentParams {}

export interface SlimewispComponent {}

export const SlimewispComponentArray = new ServerComponentArray<SlimewispComponent, SlimewispComponentParams, never>(ServerComponentType.slimewisp, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): SlimewispComponentParams {
   return {};
}

function createComponent(): SlimewispComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}