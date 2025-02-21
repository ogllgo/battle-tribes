import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";

export interface TamingComponentParams {
   readonly tamingTier: number;
   readonly berriesEatenInTier: number;
   readonly name: string;
}

export class TamingComponent {
   public tamingTier: number;
   public berriesEatenInTier: number;
   public name: string;

   constructor(tamingTier: number, berriesEatenInTier: number, name: string) {
      this.tamingTier = tamingTier;
      this.berriesEatenInTier = berriesEatenInTier;
      this.name = name;
   }
}

export const TamingComponentArray = new ServerComponentArray<TamingComponent, TamingComponentParams, never>(ServerComponentType.taming, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): TamingComponentParams {
   const tamingTier = reader.readNumber();
   const berriesEatenInTier = reader.readNumber();
   const name = reader.readString();
   
   return {
      tamingTier: tamingTier,
      berriesEatenInTier: berriesEatenInTier,
      name: name
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.taming, never>): TamingComponent {
   const tamingComponentParams = entityConfig.serverComponents[ServerComponentType.taming];
   return {
      tamingTier: tamingComponentParams.tamingTier,
      berriesEatenInTier: tamingComponentParams.berriesEatenInTier,
      name: tamingComponentParams.name
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   reader.padString();
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const tamingComponent = TamingComponentArray.getComponent(entity);

   tamingComponent.tamingTier = reader.readNumber();
   tamingComponent.berriesEatenInTier = reader.readNumber();
   tamingComponent.name = reader.readString();
}