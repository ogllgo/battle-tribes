import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface LootComponentParams {}

export interface LootComponent {}

export const LootComponentArray = new ServerComponentArray<LootComponent, LootComponentParams, never>(ServerComponentType.loot, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): LootComponentParams {
   return {};
}

function createComponent(): LootComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}
   
function padData(): void {}

function updateFromData(): void {}