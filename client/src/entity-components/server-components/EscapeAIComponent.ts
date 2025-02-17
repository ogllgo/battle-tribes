import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface EscapeAIComponentParams {}

export interface EscapeAIComponent {}

export const EscapeAIComponentArray = new ServerComponentArray<EscapeAIComponent, EscapeAIComponentParams, never>(ServerComponentType.escapeAI, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): EscapeAIComponentParams {
   return {};
}

function createComponent(): EscapeAIComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(): void {}

function updateFromData(): void {}