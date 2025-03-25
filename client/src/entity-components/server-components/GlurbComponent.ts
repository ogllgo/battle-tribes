import { ServerComponentType } from "../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface GlurbComponentParams {}

interface IntermediateInfo {}

export interface GlurbComponent {}

export const GlurbComponentArray = new ServerComponentArray<GlurbComponent, GlurbComponentParams, IntermediateInfo>(ServerComponentType.glurb, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): GlurbComponentParams {
   return {};
}

function createComponent(): GlurbComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(): void {}

function updateFromData(): void {}