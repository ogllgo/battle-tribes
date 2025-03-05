import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface FleshSwordComponentParams {}

export interface FleshSwordComponent {}

export const FleshSwordComponentArray = new ServerComponentArray<FleshSwordComponent, FleshSwordComponentParams>(ServerComponentType.fleshSwordItem, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): FleshSwordComponentParams {
   return {};
}

function createComponent(): FleshSwordComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(): void {}

function updateFromData(): void {}