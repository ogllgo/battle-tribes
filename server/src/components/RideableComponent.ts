import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { rotateXAroundOrigin, rotateYAroundOrigin } from "../../../shared/src/utils";
import { Hitbox } from "../hitboxes";
import { entityExists } from "../world";
import { ComponentArray } from "./ComponentArray";
import { attachEntity, attachEntityWithTether, removeAttachedEntity, TransformComponentArray } from "./TransformComponent";

interface CarrySlot {
   occupiedEntity: Entity;
   readonly parentHitbox: Hitbox;
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

export function createCarrySlot(parentHitbox: Hitbox, offsetX: number, offsetY: number, dismountOffsetX: number, dismountOffsetY: number): CarrySlot {
   return {
      occupiedEntity: 0,
      parentHitbox: parentHitbox,
      offsetX: offsetX,
      offsetY: offsetY,
      dismountOffsetX: dismountOffsetX,
      dismountOffsetY: dismountOffsetY
   };
}

function getDataLength(entity: Entity): number {
   const rideableComponent = RideableComponentArray.getComponent(entity);
   return Float32Array.BYTES_PER_ELEMENT + 5 * Float32Array.BYTES_PER_ELEMENT * rideableComponent.carrySlots.length;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const rideableComponent = RideableComponentArray.getComponent(entity);

   packet.addNumber(rideableComponent.carrySlots.length);
   for (const carrySlot of rideableComponent.carrySlots) {
      packet.addNumber(carrySlot.occupiedEntity);
      packet.addNumber(carrySlot.offsetX);
      packet.addNumber(carrySlot.offsetY);
      packet.addNumber(carrySlot.dismountOffsetX);
      packet.addNumber(carrySlot.dismountOffsetY);
   }
}

export function mountCarrySlot(entity: Entity, mount: Entity, carrySlot: CarrySlot): void {
   attachEntityWithTether(entity, mount, carrySlot.parentHitbox, 0, 10, 0.4, false, false);
   carrySlot.occupiedEntity = entity;
}

export function dismountCarrySlot(entity: Entity, mount: Entity): void {
   const rideableComponent = RideableComponentArray.getComponent(mount);
   const carrySlot = rideableComponent.carrySlots[0];

   removeAttachedEntity(mount, entity); 
   carrySlot.occupiedEntity = 0;

   // Set the entity to the dismount position

   const transformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = transformComponent.children[0] as Hitbox;
   
   const mountTransformComponent = TransformComponentArray.getComponent(mount);
   const mountHitbox = mountTransformComponent.children[0] as Hitbox;
   
   entityHitbox.box.position.x = mountHitbox.box.position.x + rotateXAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountHitbox.box.angle);
   entityHitbox.box.position.y = mountHitbox.box.position.y + rotateYAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountHitbox.box.angle);
}