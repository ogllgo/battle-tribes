import { PivotPointType } from "../../../shared/src/boxes/BaseBox";
import { Box, HitboxCollisionType, HitboxFlag, updateVertexPositionsAndSideAxes } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { PacketReader } from "../../../shared/src/packets";
import { Point } from "../../../shared/src/utils";
import Board from "../Board";
import { getHitboxByLocalID } from "../entity-components/server-components/TransformComponent";
import { createHitbox, Hitbox, HitboxTether } from "../hitboxes";

const readCircularBoxFromData = (reader: PacketReader): CircularBox => {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeAngle = reader.readNumber();
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

export function readHitboxFromData(reader: PacketReader, localID: number, hitboxes: ReadonlyArray<Hitbox>): Hitbox {
   const box = readBoxFromData(reader);

   const previousPosition = new Point(reader.readNumber(), reader.readNumber());
   const acceleration = new Point(reader.readNumber(), reader.readNumber());

   const tethers = new Array<HitboxTether>();
   const numTethers = reader.readNumber();
   for (let i = 0; i < numTethers; i++) {
      const originBox = readBoxFromData(reader);
      const idealDistance = reader.readNumber();
      const springConstant = reader.readNumber();
      const damping = reader.readNumber();
      const tether: HitboxTether = {
         originBox: originBox,
         idealDistance: idealDistance,
         springConstant: springConstant,
         damping: damping
      };
      tethers.push(tether);
   }
   
   const previousRelativeAngle = reader.readNumber();
   const angularAcceleration = reader.readNumber();
   
   const mass = reader.readNumber();
   const collisionType = reader.readNumber() as HitboxCollisionType;
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();
   
   const numFlags = reader.readNumber();
   const flags = new Array<HitboxFlag>();
   for (let i = 0; i < numFlags; i++) {
      flags.push(reader.readNumber());
   }

   const entity = reader.readNumber();
   const rootEntity = reader.readNumber();

   const parentHitboxLocalID = reader.readNumber();
   // @INCOMPLETE @BUG: can't get from other transform components!
   const parentHitbox = getHitboxByLocalID(hitboxes, parentHitboxLocalID);

   const isPartOfParent = reader.readBoolean();
   reader.padOffset(3);

   const hitbox = createHitbox(localID, entity, rootEntity, parentHitbox, isPartOfParent, box, previousPosition, acceleration, tethers, previousRelativeAngle, angularAcceleration, mass, collisionType, collisionBit, collisionMask, flags);
   return hitbox;
}
export function padHitboxDataExceptLocalID(reader: PacketReader): void {
   padBoxData(reader);

   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);

   // Tethers
   const numTethers = reader.readNumber();
   for (let i = 0; i < numTethers; i++) {
      padBoxData(reader);
      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   }

   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);

   const numFlags = reader.readNumber();
   reader.padOffset(numFlags * Float32Array.BYTES_PER_ELEMENT);

   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT); // entity and rootEntity

   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

   reader.padOffset(Float32Array.BYTES_PER_ELEMENT); // isPartOfParent
}

const updateCircularBoxFromData = (box: CircularBox, reader: PacketReader): void => {
   box.position.x = reader.readNumber();
   box.position.y = reader.readNumber();
   box.relativeAngle = reader.readNumber();
   box.angle = reader.readNumber();
   box.offset.x = reader.readNumber();
   box.offset.y = reader.readNumber();
   box.pivot.type = reader.readNumber();
   box.pivot.pos.x = reader.readNumber();
   box.pivot.pos.y = reader.readNumber();
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
   box.pivot.type = reader.readNumber();
   box.pivot.pos.x = reader.readNumber();
   box.pivot.pos.y = reader.readNumber();
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

   hitbox.previousPosition.x = reader.readNumber();
   hitbox.previousPosition.y = reader.readNumber();
   hitbox.acceleration.x = reader.readNumber();
   hitbox.acceleration.y = reader.readNumber();

   // Remove all previous tethers and add new ones

   hitbox.tethers.splice(0, hitbox.tethers.length);
   
   const numTethers = reader.readNumber();
   for (let i = 0; i < numTethers; i++) {
      const originBox = readBoxFromData(reader);
      const idealDistance = reader.readNumber();
      const springConstant = reader.readNumber();
      const damping = reader.readNumber();
      const tether: HitboxTether = {
         originBox: originBox,
         idealDistance: idealDistance,
         springConstant: springConstant,
         damping: damping
      };
      hitbox.tethers.push(tether);
   }

   hitbox.previousRelativeAngle = reader.readNumber();
   hitbox.angularAcceleration = reader.readNumber();
   
   hitbox.mass = reader.readNumber();
   hitbox.collisionType = reader.readNumber() as HitboxCollisionType;
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   
   const numFlags = reader.readNumber();
   reader.padOffset(numFlags * Float32Array.BYTES_PER_ELEMENT);

   reader.padOffset(Float32Array.BYTES_PER_ELEMENT); // entity
   hitbox.rootEntity = reader.readNumber();
   
   // @HACK @INCOMPLETE
   const parentLocalID = reader.readNumber();

   hitbox.isPartOfParent = reader.readBoolean();
   reader.padOffset(3);

   hitbox.lastUpdateTicks = Board.serverTicks;
}