import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface KrumblidComponentParams {}

export interface KrumblidComponent {}

export const KrumblidComponentArray = new ServerComponentArray<KrumblidComponent, KrumblidComponentParams, never>(ServerComponentType.krumblid, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): KrumblidComponentParams {
   return {};
}

function createComponent(): KrumblidComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}