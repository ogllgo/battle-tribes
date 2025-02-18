import { circlesDoIntersect, circleAndRectangleDoIntersect, HitboxCollisionBit } from "../collision";
import { Point } from "../utils";
import { CircularBox } from "./CircularBox";
import RectangularBox from "./RectangularBox";

export const enum HitboxFlag {
   NON_GRASS_BLOCKING,
   // @Cleanup @Speed: This seems like it's central collision logic, perhaps instead change into a "collidesWithWalls" boolean on hitbox objects?
   IGNORES_WALL_COLLISIONS,
   GUARDIAN_LIMB_HITBOX,
   GLURB_HEAD_SEGMENT,
   GLURB_TAIL_SEGMENT,
   COW_BODY,
   COW_HEAD
}

export const enum HitboxCollisionType {
   soft,
   hard
}

export const enum BoxType {
   circular,
   rectangular
}

export type Box = CircularBox | RectangularBox;

export type BoxFromType = {
   [BoxType.circular]: CircularBox;
   [BoxType.rectangular]: RectangularBox;
}

export interface Hitbox<T extends BoxType = BoxType> {
   readonly box: BoxFromType[T];
   mass: number;
   collisionType: HitboxCollisionType;
   readonly collisionBit: HitboxCollisionBit;
   readonly collisionMask: number;
   readonly flags: ReadonlyArray<HitboxFlag>;
   // @Memory: entities without physics components don't need these 4.
   boundsMinX: number;
   boundsMaxX: number;
   boundsMinY: number;
   boundsMaxY: number;
}

export function createHitbox<T extends BoxType>(box: BoxFromType[T], mass: number, collisionType: HitboxCollisionType, collisionBit: HitboxCollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox<T> {
   return {
      box: box,
      mass: mass,
      collisionType: collisionType,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      flags: flags,
      boundsMinX: 0,
      boundsMaxX: 0,
      boundsMinY: 0,
      boundsMaxY: 0
   };
}

export function boxIsCircular(box: Box): box is CircularBox {
   return typeof (box as CircularBox).radius !== "undefined";
}

export function hitboxIsCircular(hitbox: Hitbox): hitbox is Hitbox<BoxType.circular> {
   return typeof (hitbox.box as CircularBox).radius !== "undefined";
}

export function assertBoxIsCircular(box: Box): asserts box is CircularBox {
   if (!boxIsCircular(box)) {
      throw new Error();
   }
}

export function assertBoxIsRectangular(box: Box): asserts box is RectangularBox {
   if (boxIsCircular(box)) {
      throw new Error();
   }
}

export function assertHitboxIsRectangular(hitbox: Hitbox): asserts hitbox is Hitbox<BoxType.rectangular> {
   if (boxIsCircular(hitbox.box)) {
      throw new Error();
   }
}

export function updateVertexPositionsAndSideAxes(box: RectangularBox): void {
   const x1 = -box.width * box.scale * 0.5;
   const x2 = box.width * box.scale * 0.5;
   const y2 = box.height * box.scale * 0.5;

   const rotation = box.rotation;
   const sinRotation = Math.sin(rotation);
   const cosRotation = Math.cos(rotation);

   // Rotate vertices
   box.topLeftVertexOffset.x = cosRotation * x1 + sinRotation * y2;
   box.topLeftVertexOffset.y = cosRotation * y2 - sinRotation * x1;
   box.topRightVertexOffset.x = cosRotation * x2 + sinRotation * y2;
   box.topRightVertexOffset.y = cosRotation * y2 - sinRotation * x2;

   // Angle between vertex 0 (top left) and vertex 1 (top right)
   // @Speed: If we do a different axis, can we get rid of the minus?
   box.axisX = cosRotation;
   box.axisY = -sinRotation;
}

export function updateBox(box: Box, parentX: number, parentY: number, parentRotation: number): void {
   const cosRotation = Math.cos(parentRotation);
   const sinRotation = Math.sin(parentRotation);
   
   const offsetX = box.offset.x * box.scale;
   const offsetY = box.offset.y * box.scale;
   box.position.x = parentX + cosRotation * offsetX + sinRotation * offsetY;
   box.position.y = parentY + cosRotation * offsetY - sinRotation * offsetX;

   box.rotation = box.relativeRotation + parentRotation;

   if (!boxIsCircular(box)) {
      updateVertexPositionsAndSideAxes(box);
   }
}

export function boxIsWithinRange(box: Box, position: Point, range: number): boolean {
   if (boxIsCircular(box)) {
      // Circular hitbox
      return circlesDoIntersect(position, range, box.position, box.radius * box.scale);
   } else {
      // Rectangular hitbox
      return circleAndRectangleDoIntersect(position, range, box.position, box.width * box.scale, box.height * box.scale, box.rotation);
   }
}

export function cloneHitbox(hitbox: Hitbox): Hitbox {
   return createHitbox(hitbox.box, hitbox.mass, hitbox.collisionType, hitbox.collisionBit, hitbox.collisionMask, hitbox.flags);
}