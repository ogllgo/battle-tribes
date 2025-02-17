import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { rotateXAroundOrigin, rotateYAroundOrigin } from "../../../shared/src/utils";
import { entityExists } from "../world";
import { ComponentArray } from "./ComponentArray";
import { dismountEntity, mountEntity, TransformComponentArray } from "./TransformComponent";

interface CarrySlot {
   occupiedEntity: Entity;
   readonly offsetX: number;
   readonly offsetY: number;
   // Offset from the carry slot
   readonly dismountOffsetX: number;
   readonly dismountOffsetY: number;
}

export class RideableComponent {
   readonly carrySlots = new Array<CarrySlot>();
}

export const RideableComponentArray = new ComponentArray<RideableComponent>(ServerComponentType.rideable, true, getDataLength, addDataToPacket);

export function createCarrySlot(offsetX: number, offsetY: number, dismountOffsetX: number, dismountOffsetY: number): CarrySlot {
   return {
      occupiedEntity: 0,
      offsetX: offsetX,
      offsetY: offsetY,
      dismountOffsetX: dismountOffsetX,
      dismountOffsetY: dismountOffsetY
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

export function mountCarrySlot(entity: Entity, mount: Entity, carrySlot: CarrySlot): void {
   mountEntity(entity, mount, carrySlot.offsetX, carrySlot.offsetY);
   carrySlot.occupiedEntity = entity;
}

export function dismountCarrySlot(entity: Entity, mount: Entity): void {
   const rideableComponent = RideableComponentArray.getComponent(mount);
   const carrySlot = rideableComponent.carrySlots[0];

   dismountEntity(entity);
   carrySlot.occupiedEntity = 0;

   // Set the entity to the dismount position
   const transformComponent = TransformComponentArray.getComponent(entity);
   const mountTransformComponent = TransformComponentArray.getComponent(mount);
   transformComponent.position.x = mountTransformComponent.position.x + rotateXAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountTransformComponent.relativeRotation);
   transformComponent.position.y = mountTransformComponent.position.y + rotateYAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountTransformComponent.relativeRotation);
}