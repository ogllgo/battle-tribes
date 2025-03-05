import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface BlockAttackComponentParams {
   readonly hasBlocked: boolean;
}

export interface BlockAttackComponent {
   hasBlocked: boolean;
}

export const BlockAttackComponentArray = new ServerComponentArray<BlockAttackComponent, BlockAttackComponentParams, never>(ServerComponentType.blockAttack, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): BlockAttackComponentParams {
   const hasBlocked = reader.readBoolean();
   reader.padOffset(3);
   
   return {
      hasBlocked: hasBlocked
   };
}

function createComponent(entityParams: EntityParams): BlockAttackComponent {
   const blockAttackComponentParams = entityParams.serverComponentParams[ServerComponentType.blockAttack]!;
   
   return {
      hasBlocked: blockAttackComponentParams.hasBlocked
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const blockAttackComponent = BlockAttackComponentArray.getComponent(entity);
   blockAttackComponent.hasBlocked = reader.readBoolean();
   reader.padOffset(3);
}