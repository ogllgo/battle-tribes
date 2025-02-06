import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityConfig } from "../ComponentArray";
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

function createComponent(entityConfig: EntityConfig<ServerComponentType.blockAttack, never>): BlockAttackComponent {
   const blockAttackComponentParams = entityConfig.serverComponents[ServerComponentType.blockAttack];
   
   return {
      hasBlocked: blockAttackComponentParams.hasBlocked
   };
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const blockAttackComponent = BlockAttackComponentArray.getComponent(entity);
   blockAttackComponent.hasBlocked = reader.readBoolean();
   reader.padOffset(3);
}