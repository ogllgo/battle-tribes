import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";

export interface TribeMemberComponentParams {
   name: string;
}

export interface TribeMemberComponent {
   name: string;
}

export const TribeMemberComponentArray = new ServerComponentArray<TribeMemberComponent, TribeMemberComponentParams, never>(ServerComponentType.tribeMember, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): TribeMemberComponentParams {
   const name = reader.readString();
   return {
      name: name
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.tribeMember, never>): TribeMemberComponent {
   const tribeMemberComponentParams = entityConfig.serverComponents[ServerComponentType.tribeMember];
   return {
      name: tribeMemberComponentParams.name
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(reader: PacketReader): void {
   reader.padString();
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity);
   tribeMemberComponent.name = reader.readString();
}