import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { PacketReader } from "../../../../shared/src/packets";

export interface AttackingEntitiesComponentParams {}

export interface AttackingEntitiesComponent {}

export const AttackingEntitiesComponentArray = new ServerComponentArray<AttackingEntitiesComponent, AttackingEntitiesComponentParams, never>(ServerComponentType.attackingEntities, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

export function createAttackingEntitiesComponentParams(): AttackingEntitiesComponentParams {
   return {};
}

function createParamsFromData(reader: PacketReader): AttackingEntitiesComponentParams {
   padData(reader);
   return createAttackingEntitiesComponentParams();
}

function createComponent(): AttackingEntitiesComponent {
   return createAttackingEntitiesComponentParams();
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(reader: PacketReader): void {
   const numAttackingEntities = reader.readNumber();
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT * numAttackingEntities);
}

function updateFromData(reader: PacketReader): void {
   padData(reader);
}