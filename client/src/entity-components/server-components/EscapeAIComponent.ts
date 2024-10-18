import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface EscapeAIComponentParams {}

export interface EscapeAIComponent {}

export const EscapeAIComponentArray = new ServerComponentArray<EscapeAIComponent, EscapeAIComponentParams, never>(ServerComponentType.escapeAI, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): EscapeAIComponentParams {
   const numAttackingEntities = reader.readNumber();
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numAttackingEntities);

   return {};
}

function createComponent(): EscapeAIComponent {
   return {};
}

function padData(reader: PacketReader): void {
   const numAttackingEntities = reader.readNumber();
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numAttackingEntities);
}

function updateFromData(reader: PacketReader): void {
   const numAttackingEntities = reader.readNumber();
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numAttackingEntities);
}