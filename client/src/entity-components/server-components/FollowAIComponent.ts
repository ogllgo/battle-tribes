import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface FollowAIComponentParams {}

export interface FollowAIComponent {}

export const FollowAIComponentArray = new ServerComponentArray<FollowAIComponent, FollowAIComponentParams, never>(ServerComponentType.followAI, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): FollowAIComponentParams {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   return {};
}

function createComponent(): FollowAIComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}