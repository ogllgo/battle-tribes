import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface SwingAttackComponentParams {}

export interface SwingAttackComponent {}

export const SwingAttackComponentArray = new ServerComponentArray<SwingAttackComponent, SwingAttackComponentParams, never>(ServerComponentType.swingAttack, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): SwingAttackComponentParams {
   return {};
}

function createComponent(): SwingAttackComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}