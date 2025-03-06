import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface AIHelperComponentParams {}

export interface AIHelperComponent {}

export const AIHelperComponentArray = new ServerComponentArray<AIHelperComponent, AIHelperComponentParams, never>(ServerComponentType.aiHelper, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (): AIHelperComponentParams => {
   return {};
}

export function createAIHelperComponentParams(): AIHelperComponentParams {
   return fillParams();
}

function createParamsFromData(reader: PacketReader): AIHelperComponentParams {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   
   return fillParams();
}

function createComponent(): AIHelperComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}