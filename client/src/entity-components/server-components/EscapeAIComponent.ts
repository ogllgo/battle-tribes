import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface EscapeAIComponentParams {}

export interface EscapeAIComponent {}

export const EscapeAIComponentArray = new ServerComponentArray<EscapeAIComponent, EscapeAIComponentParams, never>(ServerComponentType.escapeAI, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): EscapeAIComponentParams {
   return {};
}

function createComponent(): EscapeAIComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}