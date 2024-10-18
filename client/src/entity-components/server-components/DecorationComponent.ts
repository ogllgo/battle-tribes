import { PacketReader } from "battletribes-shared/packets";
import { DecorationType } from "battletribes-shared/components";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";
import { EntityID } from "../../../../shared/src/entities";

export interface DecorationComponentParams {
   readonly decorationType: DecorationType;
}

export interface DecorationComponent {
   decorationType: DecorationType;
}

export const DecorationComponentArray = new ServerComponentArray<DecorationComponent, DecorationComponentParams, never>(ServerComponentType.decoration, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): DecorationComponentParams {
   const decorationType = reader.readNumber();

   return {
      decorationType: decorationType
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.decoration>): DecorationComponent {
   return {
      decorationType: entityConfig.components[ServerComponentType.decoration].decorationType
   };
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const decorationComponent = DecorationComponentArray.getComponent(entity);
   decorationComponent.decorationType = reader.readNumber();
}