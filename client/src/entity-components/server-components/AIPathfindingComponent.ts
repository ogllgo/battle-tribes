import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface AIPathfindingComponentParams {}

export class AIPathfindingComponent {}

export const AIPathfindingComponentArray = new ServerComponentArray<AIPathfindingComponent>(ServerComponentType.aiPathfinding, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
})

function createParamsFromData(): AIPathfindingComponentParams {
   return {};
}

function createComponent(): AIPathfindingComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(): void {}

function updateFromData(): void {}