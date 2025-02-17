import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface PatrolAIComponentParams {}

export interface PatrolAIComponent {}

export const PatrolAIComponentArray = new ServerComponentArray<PatrolAIComponent, PatrolAIComponentParams, never>(ServerComponentType.patrolAI, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(): PatrolAIComponentParams {
   return {};
}

function createComponent(): PatrolAIComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(): void {}

function updateFromData(): void {}