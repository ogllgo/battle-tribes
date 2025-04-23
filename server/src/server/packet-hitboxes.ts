import BaseBox from "../../../shared/src/boxes/BaseBox";
import { Box, boxIsCircular } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { Packet } from "../../../shared/src/packets";
import { Hitbox } from "../hitboxes";

const addBaseBoxData = (packet: Packet, box: BaseBox): void => {
   packet.addNumber(box.position.x);
   packet.addNumber(box.position.y);
   packet.addNumber(box.relativeAngle);
   packet.addNumber(box.angle);
   packet.addNumber(box.offset.x);
   packet.addNumber(box.offset.y);

   // Pivot
   packet.addNumber(box.pivot.type);
   packet.addNumber(box.pivot.pos.x);
   packet.addNumber(box.pivot.pos.y);
   
   packet.addNumber(box.scale);
   packet.addBoolean(box.totalFlipXMultiplier === -1 ? true : false);
   packet.padOffset(3);
}
const getBaseBoxDataLength = (): number => {
   return 11 * Float32Array.BYTES_PER_ELEMENT;
}

const addCircularBoxData = (packet: Packet, box: CircularBox): void => {
   addBaseBoxData(packet, box);
   packet.addNumber(box.radius);
}
const getCircularBoxDataLength = (): number => {
   return getBaseBoxDataLength() + Float32Array.BYTES_PER_ELEMENT;
}

const addRectangularBoxData = (packet: Packet, box: RectangularBox): void => {
   addBaseBoxData(packet, box);
   packet.addNumber(box.width);
   packet.addNumber(box.height);
}
const getRectangularBoxDataLength = (): number => {
   return getBaseBoxDataLength() + 2 * Float32Array.BYTES_PER_ELEMENT;
}

export function addBoxDataToPacket(packet: Packet, box: Box): void {
   const isCircular = boxIsCircular(box);
      
   // Is circular
   packet.addBoolean(isCircular);
   packet.padOffset(3);

   if (isCircular) {
      addCircularBoxData(packet, box);
   } else {
      // @Hack: cast
      addRectangularBoxData(packet, box);
   }
}
export function getBoxDataLength(box: Box): number {
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   if (boxIsCircular(box)) {
      lengthBytes += getCircularBoxDataLength();
   } else {
      lengthBytes += getRectangularBoxDataLength();
   }
   return lengthBytes;
}

export function addHitboxDataToPacket(packet: Packet, hitbox: Hitbox): void {
   // Important that local ID is first (see how the client uses it when updating from data)
   packet.addNumber(hitbox.localID);

   addBoxDataToPacket(packet, hitbox.box);

   packet.addNumber(hitbox.previousPosition.x);
   packet.addNumber(hitbox.previousPosition.y);
   packet.addNumber(hitbox.acceleration.x);
   packet.addNumber(hitbox.acceleration.y);

   // Tethers
   packet.addNumber(hitbox.tethers.length);
   for (const tether of hitbox.tethers) {
      addBoxDataToPacket(packet, tether.originHitbox.box);
      packet.addNumber(tether.idealDistance);
      packet.addNumber(tether.springConstant);
      packet.addNumber(tether.damping);
   }

   packet.addNumber(hitbox.previousRelativeAngle);
   packet.addNumber(hitbox.angularAcceleration);
   
   packet.addNumber(hitbox.mass);
   packet.addNumber(hitbox.collisionType);
   packet.addNumber(hitbox.collisionBit);
   packet.addNumber(hitbox.collisionMask);
   // Flags
   packet.addNumber(hitbox.flags.length);
   for (const flag of hitbox.flags) {
      packet.addNumber(flag);
   }

   const parentLocalID = hitbox.parent !== null ? hitbox.parent.localID : -1;
   packet.addNumber(parentLocalID);
}
export function getHitboxDataLength(hitbox: Hitbox): number {
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += getBoxDataLength(hitbox.box);
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT;

   // Tethers
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const tether of hitbox.tethers) {
      lengthBytes += getBoxDataLength(tether.originHitbox.box);
      lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
   }
   
   // angle shit
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * hitbox.flags.length;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   return lengthBytes;
}