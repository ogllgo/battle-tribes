import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface SwingAttackComponentParams {}

export interface SwingAttackComponent {}

export const SwingAttackComponentArray = new ServerComponentArray<SwingAttackComponent, SwingAttackComponentParams, never>(ServerComponentType.swingAttack, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): SwingAttackComponentParams {
   return {};
}

function createComponent(): SwingAttackComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(): void {}

function updateFromData(): void {}