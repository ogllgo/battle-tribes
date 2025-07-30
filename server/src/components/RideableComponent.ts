import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { Point, rotateXAroundOrigin, rotateYAroundOrigin } from "../../../shared/src/utils";
import { Hitbox } from "../hitboxes";
import { entityExists } from "../world";
import { ComponentArray } from "./ComponentArray";
import { attachHitbox, detachHitbox, TransformComponentArray } from "./TransformComponent";

interface CarrySlot {
   occupiedEntity: Entity;
   readonly parentHitbox: Hitbox;
   readonly offset: Point;
   // Offset from the carry slot
   readonly dismountOffset: Point;
}

export class RideableComponent {
   readonly carrySlots = new Array<CarrySlot>();
}

export const RideableComponentArray = new ComponentArray<RideableComponent>(ServerComponentType.rideable, true, getDataLength, addDataToPacket);

export function createCarrySlot(parentHitbox: Hitbox, offset: Point, dismountOffset: Point): CarrySlot {
   return {
      occupiedEntity: 0,
      parentHitbox: parentHitbox,
      offset: offset,
      dismountOffset: dismountOffset
   };
}

function getDataLength(entity: Entity): number {
   const rideableComponent = RideableComponentArray.getComponent(entity);
   return Float32Array.BYTES_PER_ELEMENT + 6 * Float32Array.BYTES_PER_ELEMENT * rideableComponent.carrySlots.length;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const rideableComponent = RideableComponentArray.getComponent(entity);

   packet.addNumber(rideableComponent.carrySlots.length);
   for (const carrySlot of rideableComponent.carrySlots) {
      packet.addNumber(carrySlot.occupiedEntity);
      packet.addNumber(carrySlot.parentHitbox.localID);
      packet.addPoint(carrySlot.offset);
      packet.addPoint(carrySlot.dismountOffset);
   }
}

export function getAvailableCarrySlot(rideableComponent: RideableComponent): CarrySlot | null {
   for (const carrySlot of rideableComponent.carrySlots) {
      if (!entityExists(carrySlot.occupiedEntity)) {
         return carrySlot;
      }
   }
   return null;
}

export function mountCarrySlot(entity: Entity, carrySlot: CarrySlot): void {
   // Set the entity to the carry slot's position
   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = entityTransformComponent.hitboxes[0];
   entityHitbox.box.position.x = carrySlot.parentHitbox.box.position.x + rotateXAroundOrigin(carrySlot.offset.x, carrySlot.offset.y, carrySlot.parentHitbox.box.angle);
   entityHitbox.box.position.y = carrySlot.parentHitbox.box.position.y + rotateYAroundOrigin(carrySlot.offset.x, carrySlot.offset.y, carrySlot.parentHitbox.box.angle);
   
   // attachEntityWithTether(entity, mount, carrySlot.parentHitbox, 0, 10, 0.4, false);
   // @INCOMPLETE: SHOULD USE TETHER!!!!
   attachHitbox(entityHitbox, carrySlot.parentHitbox, false);
   carrySlot.occupiedEntity = entity;
}

export function dismountMount(entity: Entity, mount: Entity): void {
   // Find the carry slot the entity is attached to
   let carrySlot: CarrySlot | undefined;
   const rideableComponent = RideableComponentArray.getComponent(mount);
   for (const currentCarrySlot of rideableComponent.carrySlots) {
      if (currentCarrySlot.occupiedEntity === entity) {
         carrySlot = currentCarrySlot;
         break;
      }
   }
   
   if (typeof carrySlot === "undefined") {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);

   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.parent !== null && hitbox.parent.entity === mount) {
         detachHitbox(hitbox);
      }
   }

   carrySlot.occupiedEntity = 0;

   // Set the entity to the dismount position

   const entityHitbox = transformComponent.hitboxes[0];
   const mountHitbox = carrySlot.parentHitbox;
   
   entityHitbox.box.position.x = mountHitbox.box.position.x + rotateXAroundOrigin(carrySlot.offset.x + carrySlot.dismountOffset.x, carrySlot.offset.y + carrySlot.dismountOffset.y, mountHitbox.box.angle);
   entityHitbox.box.position.y = mountHitbox.box.position.y + rotateYAroundOrigin(carrySlot.offset.x + carrySlot.dismountOffset.x, carrySlot.offset.y + carrySlot.dismountOffset.y, mountHitbox.box.angle);
}