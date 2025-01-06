import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface ScrappyComponentParams {}

export interface ScrappyComponent {}

export const ScrappyComponentArray = new ServerComponentArray<ScrappyComponent, ScrappyComponentParams, never>(ServerComponentType.scrappy, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): ScrappyComponentParams {
   return {};
}

function createComponent(): ScrappyComponent {
   return {};
}

function padData(): void {}
   
function updateFromData(): void {}