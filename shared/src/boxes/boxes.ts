import { circlesDoIntersect, circleAndRectangleDoIntersect } from "../collision";
import { Point } from "../utils";
import { CircularBox } from "./CircularBox";
import RectangularBox from "./RectangularBox";

export const enum HitboxFlag {
   NON_GRASS_BLOCKING,
   // @Cleanup @Speed: This seems like it's central collision logic, perhaps instead change into a "collidesWithWalls" boolean on hitbox objects?
   IGNORES_WALL_COLLISIONS,
   GUARDIAN_LIMB_HITBOX,
   GLURB_TAIL_SEGMENT,
   COW_BODY,
   COW_HEAD,
   YETI_BODY,
   YETI_HEAD,
   OKREN_BODY,
   OKREN_BIG_ARM_SEGMENT,
   OKREN_MEDIUM_ARM_SEGMENT,
   OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION,
   OKREN_EYE,
   OKREN_MANDIBLE,
   KRUMBLID_BODY,
   KRUMBLID_MANDIBLE
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

export function boxIsCircular(box: Box): box is CircularBox {
   return typeof (box as CircularBox).radius !== "undefined";
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

export function updateVertexPositionsAndSideAxes(box: RectangularBox): void {
   const x1 = -box.width * box.scale * 0.5;
   const x2 = box.width * box.scale * 0.5;
   const y2 = box.height * box.scale * 0.5;

   const rotation = box.angle;
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

export function updateBox(box: Box, parent: Box): void {
   const cosRotation = Math.cos(parent.angle);
   const sinRotation = Math.sin(parent.angle);
   
   box.totalFlipXMultiplier = (box.flipX ? -1 : 1) * parent.totalFlipXMultiplier;
   
   let offsetX = box.offset.x * box.scale;
   if (box.totalFlipXMultiplier === -1) {
      offsetX *= -1;
   }
   const offsetY = box.offset.y * box.scale;
   box.position.x = parent.position.x + cosRotation * offsetX + sinRotation * offsetY;
   box.position.y = parent.position.y + cosRotation * offsetY - sinRotation * offsetX;

   box.angle = box.relativeAngle * box.totalFlipXMultiplier + parent.angle;

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
      return circleAndRectangleDoIntersect(position, range, box.position, box.width * box.scale, box.height * box.scale, box.angle);
   }
}

export function cloneBox(box: Box): Box {
   if (boxIsCircular(box)) {
      return new CircularBox(box.position.copy(), box.offset.copy(), box.angle, box.radius);
   } else {
      return new RectangularBox(box.position.copy(), box.offset.copy(), box.angle, box.width, box.height);
   }
}