import { Box, HitboxCollisionType, HitboxFlag, updateVertexPositionsAndSideAxes } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { PacketReader } from "../../../shared/src/packets";
import { Point } from "../../../shared/src/utils";
import Board from "../Board";
import { getHitboxByLocalID, TransformNode } from "../entity-components/server-components/TransformComponent";
import { createHitbox, Hitbox } from "../hitboxes";

const readCircularBoxFromData = (reader: PacketReader): CircularBox => {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeAngle = reader.readNumber();
   const angle = reader.readNumber();
   const offsetX = reader.readNumber();
   const offsetY = reader.readNumber();
   const scale = reader.readNumber();
   const flipX = reader.readBoolean();
   reader.padOffset(3);

   const radius = reader.readNumber();

   const box = new CircularBox(new Point(x, y), new Point(offsetX, offsetY), relativeAngle, radius);
   box.angle = angle;
   box.scale = scale;
   box.flipX = flipX;
   return box;
}
const padCircularBoxData = (reader: PacketReader): void => {
   reader.padOffset(9 * Float32Array.BYTES_PER_ELEMENT);
}

const readRectangularBoxFromData = (reader: PacketReader): RectangularBox => {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeAngle = reader.readNumber();
   const angle = reader.readNumber();
   const offsetX = reader.readNumber();
   const offsetY = reader.readNumber();
   const scale = reader.readNumber();
   const flipX = reader.readBoolean();
   reader.padOffset(3);

   const width = reader.readNumber();
   const height = reader.readNumber();

   const box = new RectangularBox(new Point(x, y), new Point(offsetX, offsetY), relativeAngle, width, height);
   box.angle = angle;
   box.scale = scale;
   box.flipX = flipX;
   return box;
}
const padRectangularBoxData = (reader: PacketReader): void => {
   reader.padOffset(10 * Float32Array.BYTES_PER_ELEMENT);
}

export function readBoxFromData(reader: PacketReader): Box {
   const isCircular = reader.readBoolean();
   reader.padOffset(3);

   if (isCircular) {
      return readCircularBoxFromData(reader);
   } else {
      return readRectangularBoxFromData(reader);
   }
}
export function padBoxData(reader: PacketReader): void {
   const isCircular = reader.readBoolean();
   reader.padOffset(3);

   if (isCircular) {
      padCircularBoxData(reader);
   } else {
      padRectangularBoxData(reader);
   }
}

export function readHitboxFromData(reader: PacketReader, localID: number, children: ReadonlyArray<TransformNode>): Hitbox {
   const box = readBoxFromData(reader);

   const velocity = new Point(reader.readNumber(), reader.readNumber());

   const idealAngle = reader.readNumber();
   const angleTurnSpeed = reader.readNumber();
   
   const mass = reader.readNumber();
   const collisionType = reader.readNumber() as HitboxCollisionType;
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();
   
   const numFlags = reader.readNumber();
   const flags = new Array<HitboxFlag>();
   for (let i = 0; i < numFlags; i++) {
      flags.push(reader.readNumber());
   }

   const parentHitboxLocalID = reader.readNumber();
   // @INCOMPLETE @BUG: can't get from other transform components!
   const parentHitbox = getHitboxByLocalID(children, parentHitboxLocalID);

   const hitbox = createHitbox(localID, parentHitbox, box, velocity, mass, collisionType, collisionBit, collisionMask, flags);
   hitbox.idealAngle = idealAngle;
   hitbox.angleTurnSpeed = angleTurnSpeed;
   return hitbox;
}
export function padHitboxDataExceptLocalID(reader: PacketReader): void {
   padBoxData(reader);

   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);

   const numFlags = reader.readNumber();
   reader.padOffset(numFlags * Float32Array.BYTES_PER_ELEMENT);

   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

const updateCircularBoxFromData = (box: CircularBox, reader: PacketReader): void => {
   box.position.x = reader.readNumber();
   box.position.y = reader.readNumber();
   box.relativeAngle = reader.readNumber();
   box.angle = reader.readNumber();
   box.offset.x = reader.readNumber();
   box.offset.y = reader.readNumber();
   box.scale = reader.readNumber();
   box.flipX = reader.readBoolean();
   reader.padOffset(3);
   box.radius = reader.readNumber();
}

const updateRectangularBoxFromData = (box: RectangularBox, reader: PacketReader): void => {
   box.position.x = reader.readNumber();
   box.position.y = reader.readNumber();
   box.relativeAngle = reader.readNumber();
   box.angle = reader.readNumber();
   box.offset.x = reader.readNumber();
   box.offset.y = reader.readNumber();
   box.scale = reader.readNumber();
   box.flipX = reader.readBoolean();
   reader.padOffset(3);
   box.width = reader.readNumber();
   box.height = reader.readNumber();
   
   updateVertexPositionsAndSideAxes(box);
}

export function updateBoxFromData(box: Box, reader: PacketReader): void {
   const isCircular = reader.readBoolean();
   reader.padOffset(3);

   if (isCircular) {
      updateCircularBoxFromData(box as CircularBox, reader);
   } else {
      updateRectangularBoxFromData(box as RectangularBox, reader);
   }
}

export function updateHitboxExceptLocalIDFromData(hitbox: Hitbox, reader: PacketReader): void {
   updateBoxFromData(hitbox.box, reader);

   hitbox.velocity.x = reader.readNumber();
   hitbox.velocity.y = reader.readNumber();

   hitbox.idealAngle = reader.readNumber();
   hitbox.angleTurnSpeed = reader.readNumber();
   
   hitbox.mass = reader.readNumber();
   hitbox.collisionType = reader.readNumber() as HitboxCollisionType;
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   
   const numFlags = reader.readNumber();
   reader.padOffset(numFlags * Float32Array.BYTES_PER_ELEMENT);

   // @HACK @INCOMPLETE
   const parentLocalID = reader.readNumber();

   hitbox.lastUpdateTicks = Board.serverTicks;
}