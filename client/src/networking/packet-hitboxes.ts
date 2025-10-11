import { PivotPointType } from "../../../shared/src/boxes/BaseBox";
import { Box, HitboxCollisionType, HitboxFlag, updateVertexPositionsAndSideAxes } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { Entity } from "../../../shared/src/entities";
import { PacketReader } from "../../../shared/src/packets";
import { distBetweenPointAndRectangle, Point } from "../../../shared/src/utils";

const readCircularBoxFromData = (reader: PacketReader): CircularBox => {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeAngle = reader.readNumber();
   // @Bandwidth do we need the server to send this? Or can we infer it from the relative angle tree? This hinges on whether we can have a hitbox child exist without knowing about its parent.
   const angle = reader.readNumber();
   const offsetX = reader.readNumber();
   const offsetY = reader.readNumber();
   const pivotType = reader.readNumber() as PivotPointType;
   const pivotPosX = reader.readNumber();
   const pivotPosY = reader.readNumber();
   const scale = reader.readNumber();
   const flipX = reader.readBoolean();
   reader.padOffset(3);

   const radius = reader.readNumber();

   const box = new CircularBox(new Point(x, y), new Point(offsetX, offsetY), relativeAngle, radius);
   box.angle = angle;
   box.pivot = {
      type: pivotType,
      pos: new Point(pivotPosX, pivotPosY)
   };
   box.scale = scale;
   box.flipX = flipX;
   return box;
}
const padCircularBoxData = (reader: PacketReader): void => {
   reader.padOffset(12 * Float32Array.BYTES_PER_ELEMENT);
}

const readRectangularBoxFromData = (reader: PacketReader): RectangularBox => {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeAngle = reader.readNumber();
   // @Bandwidth do we need the server to send this? Or can we infer it from the relative angle tree? This hinges on whether we can have a hitbox child exist without knowing about its parent.
   const angle = reader.readNumber();
   const offsetX = reader.readNumber();
   const offsetY = reader.readNumber();
   const pivotType = reader.readNumber() as PivotPointType;
   const pivotPosX = reader.readNumber();
   const pivotPosY = reader.readNumber();
   const scale = reader.readNumber();
   const flipX = reader.readBoolean();
   reader.padOffset(3);

   const width = reader.readNumber();
   const height = reader.readNumber();

   const box = new RectangularBox(new Point(x, y), new Point(offsetX, offsetY), relativeAngle, width, height);
   box.angle = angle;
   box.pivot = {
      type: pivotType,
      pos: new Point(pivotPosX, pivotPosY)
   };
   box.scale = scale;
   box.flipX = flipX;
   return box;
}
const padRectangularBoxData = (reader: PacketReader): void => {
   reader.padOffset(13 * Float32Array.BYTES_PER_ELEMENT);
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