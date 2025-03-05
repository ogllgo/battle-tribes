import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

interface CarrySlot {
   isOccupied: boolean;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly dismountOffsetX: number;
   readonly dismountOffsetY: number;
}

export interface RideableComponentParams {
   readonly carrySlots: ReadonlyArray<CarrySlot>;
}

export interface RideableComponent {
   readonly carrySlots: ReadonlyArray<CarrySlot>;
}

export const RideableComponentArray = new ServerComponentArray<RideableComponent, RideableComponentParams, never>(ServerComponentType.rideable, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

export function createRideableComponentParams(carrySlots: ReadonlyArray<CarrySlot>): RideableComponentParams {
   return {
      carrySlots: carrySlots
   };
}

function createParamsFromData(reader: PacketReader): RideableComponentParams {
   const carrySlots = new Array<CarrySlot>();
   
   const numCarrySlots = reader.readNumber();
   for (let i = 0; i < numCarrySlots; i++) {
      const isOccupied = reader.readBoolean();
      reader.padOffset(3);

      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();

      const dismountOffsetX = reader.readNumber();
      const dismountOffsetY = reader.readNumber();

      const carrySlot: CarrySlot = {
         isOccupied: isOccupied,
         offsetX: offsetX,
         offsetY: offsetY,
         dismountOffsetX: dismountOffsetX,
         dismountOffsetY: dismountOffsetY
      };
      carrySlots.push(carrySlot);
   }
   
   return createRideableComponentParams(carrySlots);
}

function createComponent(entityParams: EntityParams): RideableComponent {
   const rideableComponentParams = entityParams.serverComponentParams[ServerComponentType.rideable]!;
   return {
      carrySlots: rideableComponentParams.carrySlots
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(reader: PacketReader): void {
   const numCarrySlots = reader.readNumber();
   for (let i = 0; i < numCarrySlots; i++) {
      // (so that i find this when i remove the need to pad by 3 for bools)
      // reader.padOffset(3);
      reader.padOffset(5 * Float32Array.BYTES_PER_ELEMENT);
   }
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const rideableComponent = RideableComponentArray.getComponent(entity);

   reader.padOffset(Float32Array.BYTES_PER_ELEMENT)

   for (let i = 0; i < rideableComponent.carrySlots.length; i++) {
      const carrySlot = rideableComponent.carrySlots[i];
      
      carrySlot.isOccupied = reader.readBoolean();
      reader.padOffset(3);

      reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);
   }
}