import { Point } from "../utils";
import { Box } from "./boxes";

abstract class BaseBox {
   public readonly position: Point;
   /** Offset of the box from its parent. If on a root hitbox of a base entity, does nothing. */
   public readonly offset: Point;

   public relativeAngle: number;
   /** Angle the hitbox is facing, taken counterclockwise from the positive x axis (radians) */
   public angle: number;

   public scale = 1;

   constructor(position: Point, offset: Point, rotation: number) {
      this.position = position;
      this.offset = offset;
      
      this.relativeAngle = rotation;
      this.angle = rotation;
   }

   public abstract calculateBoundsMinX(): number;
   public abstract calculateBoundsMaxX(): number;
   public abstract calculateBoundsMinY(): number;
   public abstract calculateBoundsMaxY(): number;

   public abstract isColliding(otherBox: Box, epsilon?: number): boolean;
}

export default BaseBox;