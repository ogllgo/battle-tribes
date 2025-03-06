import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityParams } from "../../world";
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

const fillParams = (name: string): TribeMemberComponentParams => {
   return {
      name: name
   };
}

export function createTribeMemberComponentParams(): TribeMemberComponentParams {
   return fillParams("");
}

function createParamsFromData(reader: PacketReader): TribeMemberComponentParams {
   const name = reader.readString();
   return fillParams(name);
}

function createComponent(entityParams: EntityParams): TribeMemberComponent {
   const tribeMemberComponentParams = entityParams.serverComponentParams[ServerComponentType.tribeMember]!;
   return fillParams(tribeMemberComponentParams.name);
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