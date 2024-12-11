import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface AIAssignmentComponentParams {}

export interface AIAssignmentComponent {}

export const AIAssignmentComponentArray = new ServerComponentArray<AIAssignmentComponent, AIAssignmentComponentParams, never>(ServerComponentType.aiAssignment, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(): AIAssignmentComponentParams {
   return {};
}

function createComponent(): AIAssignmentComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}