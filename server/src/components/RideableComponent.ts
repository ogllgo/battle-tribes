import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { entityExists } from "../world";
import { ComponentArray } from "./ComponentArray";

interface CarrySlot {
   occupiedEntity: Entity;
   readonly offsetX: number;
   readonly offsetY: number;
}

export class RideableComponent {
   readonly carrySlots = new Array<CarrySlot>();
}

export const RideableComponentArray = new ComponentArray<RideableComponent>(ServerComponentType.rideable, true, getDataLength, addDataToPacket);

export function createCarrySlot(offsetX: number, offsetY: number): CarrySlot {
   return {
      occupiedEntity: 0,
      offsetX: offsetX,
      offsetY: offsetY
   };
}

function getDataLength(entity: Entity): number {
   const rideableComponent = RideableComponentArray.getComponent(entity);
   return 2 * Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * rideableComponent.carrySlots.length;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const rideableComponent = RideableComponentArray.getComponent(entity);

   packet.addNumber(rideableComponent.carrySlots.length);
   for (const carrySlot of rideableComponent.carrySlots) {
      packet.addBoolean(entityExists(carrySlot.occupiedEntity));
      packet.padOffset(3);
      packet.addNumber(carrySlot.offsetX);
      packet.addNumber(carrySlot.offsetY);
   }
}