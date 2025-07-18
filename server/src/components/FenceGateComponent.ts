import { ServerComponentType } from "battletribes-shared/components";
import { DoorToggleType, Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { angle, lerp } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
import { cleanEntityTransform, TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { registerDirtyEntity } from "../server/player-clients";
import { Hitbox } from "../hitboxes";

// @Cleanup: All the door toggling logic is stolen from DoorComponent.ts

const enum Vars {
   DOOR_SWING_SPEED = 5 / Settings.TPS
}

export class FenceGateComponent {
   public toggleType = DoorToggleType.none;
   public openProgress = 0;
}

export const FenceGateComponentArray = new ComponentArray<FenceGateComponent>(ServerComponentType.fenceGate, true, getDataLength, addDataToPacket);
FenceGateComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const doorWidth = 52;
const doorHeight = 16;

const doorHalfDiagonalLength = Math.sqrt(doorHeight * doorHeight + doorWidth * doorWidth) / 2;
const angleToCenter = angle(doorHeight, doorWidth);

const updateDoorOpenProgress = (fenceGate: Entity, fenceGateComponent: FenceGateComponent): void => {
   const baseAngle = Math.PI/2;
   const angle = baseAngle - lerp(0, Math.PI/2 - 0.1, fenceGateComponent.openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = angle + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(baseAngle + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(baseAngle + angleToCenter);

   const transformComponent = TransformComponentArray.getComponent(fenceGate);
   
   const hitbox = (transformComponent.hitboxes[0]).box as RectangularBox;
   hitbox.offset.x = xOffset;
   hitbox.offset.y = yOffset;
   hitbox.relativeAngle = angle - Math.PI/2;

   // @Hack: dirtying doesn't work on transform components for now
   // transformComponent.isDirty = true;
   cleanEntityTransform(fenceGate);
   registerDirtyEntity(fenceGate);
}

function onTick(fenceGate: Entity): void {
   // @Incomplete: Hard hitboxes
   
   const fenceGateComponent = FenceGateComponentArray.getComponent(fenceGate);
   if (fenceGateComponent.toggleType !== DoorToggleType.none) {
      switch (fenceGateComponent.toggleType) {
         case DoorToggleType.open: {
            fenceGateComponent.openProgress += Vars.DOOR_SWING_SPEED;
            if (fenceGateComponent.openProgress >= 1) {
               fenceGateComponent.openProgress = 1;
               fenceGateComponent.toggleType = DoorToggleType.none;
            }
            break;
         }
         case DoorToggleType.close: {
            fenceGateComponent.openProgress -= Vars.DOOR_SWING_SPEED;
            if (fenceGateComponent.openProgress <= 0) {
               fenceGateComponent.openProgress = 0;
               fenceGateComponent.toggleType = DoorToggleType.none;
            }
            break;
         }
      }
      updateDoorOpenProgress(fenceGate, fenceGateComponent);
   }
}

export function toggleFenceGateDoor(fenceGate: Entity): void {
   const fenceGateComponent = FenceGateComponentArray.getComponent(fenceGate);
   if (fenceGateComponent.toggleType !== DoorToggleType.none) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(fenceGate);
   
   const hitbox = transformComponent.hitboxes[0];
   if (fenceGateComponent.openProgress === 0) {
      // Open the door
      fenceGateComponent.toggleType = DoorToggleType.open;
      hitbox.collisionType = HitboxCollisionType.soft;
   } else {
      // Close the door
      fenceGateComponent.toggleType = DoorToggleType.close;
      hitbox.collisionType = HitboxCollisionType.hard;
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const fenceGateComponent = FenceGateComponentArray.getComponent(entity);

   packet.addNumber(fenceGateComponent.toggleType);
   packet.addNumber(fenceGateComponent.openProgress);
}