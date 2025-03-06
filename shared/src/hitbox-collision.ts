import { rectanglesAreColliding } from "./collision";
import { Box, boxIsCircular, assertBoxIsRectangular } from "./boxes/boxes";
import { angle, Point, rotateXAroundPoint, rotateYAroundPoint } from "./utils";
import CircularBox from "./boxes/CircularBox";
import RectangularBox from "./boxes/RectangularBox";

export interface CollisionPushInfo {
   direction: number;
   amountIn: number;
}

export const enum CollisionVars {
   NO_COLLISION = 0xFFFF
}

const getCircleCircleCollisionPushInfo = (pushedBox: CircularBox, pushingBox: CircularBox): CollisionPushInfo => {
   const dist = Math.sqrt(Math.pow(pushedBox.position.x - pushingBox.position.x, 2) + Math.pow(pushedBox.position.y - pushingBox.position.y, 2));
   
   return {
      amountIn: pushedBox.radius + pushingBox.radius - dist,
      // Angle from pushing hitbox to pushed hitbox
      direction: angle(pushedBox.position.x - pushingBox.position.x, pushedBox.position.y - pushingBox.position.y)
   };
}

const getCircleRectCollisionPushInfo = (pushedBox: CircularBox, pushingBox: RectangularBox): CollisionPushInfo => {
   const rectRotation = pushingBox.angle;

   const circlePosX = rotateXAroundPoint(pushedBox.position.x, pushedBox.position.y, pushingBox.position.x, pushingBox.position.y, -rectRotation);
   const circlePosY = rotateYAroundPoint(pushedBox.position.x, pushedBox.position.y, pushingBox.position.x, pushingBox.position.y, -rectRotation);
   
   const distanceX = circlePosX - pushingBox.position.x;
   const distanceY = circlePosY - pushingBox.position.y;

   const absDistanceX = Math.abs(distanceX);
   const absDistanceY = Math.abs(distanceY);

   // Top and bottom collisions
   if (absDistanceX <= (pushingBox.width/2)) {
      return {
         amountIn: pushingBox.height/2 + pushedBox.radius - absDistanceY,
         direction: rectRotation + Math.PI + (distanceY > 0 ? Math.PI : 0)
      };
   }

   // Left and right collisions
   if (absDistanceY <= (pushingBox.height/2)) {
      return {
         amountIn: pushingBox.width/2 + pushedBox.radius - absDistanceX,
         direction: rectRotation + (distanceX > 0 ? Math.PI/2 : -Math.PI/2)
      };
   }

   const cornerDistanceSquared = Math.pow(absDistanceX - pushingBox.width/2, 2) + Math.pow(absDistanceY - pushingBox.height/2, 2);
   if (cornerDistanceSquared <= pushedBox.radius * pushedBox.radius) {
      // @Cleanup: Whole lot of copy and paste
      const amountInX = absDistanceX - pushingBox.width/2 - pushedBox.radius;
      const amountInY = absDistanceY - pushingBox.height/2 - pushedBox.radius;
      if (Math.abs(amountInY) < Math.abs(amountInX)) {
         const closestRectBorderY = circlePosY < pushingBox.position.y ? pushingBox.position.y - pushingBox.height/2 : pushingBox.position.y + pushingBox.height/2;
         const closestRectBorderX = circlePosX < pushingBox.position.x ? pushingBox.position.x - pushingBox.width/2 : pushingBox.position.x + pushingBox.width/2;
         const xDistanceFromRectBorder = Math.abs(closestRectBorderX - circlePosX);
         const len = Math.sqrt(pushedBox.radius * pushedBox.radius - xDistanceFromRectBorder * xDistanceFromRectBorder);

         return {
            amountIn: Math.abs(closestRectBorderY - (circlePosY - len * Math.sign(distanceY))),
            direction: rectRotation + Math.PI + (distanceY > 0 ? Math.PI : 0)
         };
      } else {
         const closestRectBorderX = circlePosX < pushingBox.position.x ? pushingBox.position.x - pushingBox.width/2 : pushingBox.position.x + pushingBox.width/2;
         
         const closestRectBorderY = circlePosY < pushingBox.position.y ? pushingBox.position.y - pushingBox.height/2 : pushingBox.position.y + pushingBox.height/2;
         const yDistanceFromRectBorder = Math.abs(closestRectBorderY - circlePosY);
         const len = Math.sqrt(pushedBox.radius * pushedBox.radius - yDistanceFromRectBorder * yDistanceFromRectBorder);

         return {
            amountIn: Math.abs(closestRectBorderX - (circlePosX - len * Math.sign(distanceX))),
            direction: rectRotation + (distanceX > 0 ? Math.PI/2 : -Math.PI/2)
         };
      }
   }

   // @Incomplete
   // console.warn("Couldn't find the collision");
   return {
      amountIn: 0,
      direction: 0
   };
}

export function getCollisionPushInfo(pushedHitbox: Box, pushingHitbox: Box): CollisionPushInfo {
   const pushedHitboxIsCircular = boxIsCircular(pushedHitbox);
   const pushingHitboxIsCircular = boxIsCircular(pushingHitbox);
   
   if (pushedHitboxIsCircular && pushingHitboxIsCircular) {
      // Circle + Circle
      return getCircleCircleCollisionPushInfo(pushedHitbox, pushingHitbox);
   } else if (pushedHitboxIsCircular && !pushingHitboxIsCircular) {
      // Circle + Rectangle
      return getCircleRectCollisionPushInfo(pushedHitbox, pushingHitbox);
   } else if (!pushedHitboxIsCircular && pushingHitboxIsCircular) {
      // Rectangle + Circle
      const pushInfo = getCircleRectCollisionPushInfo(pushingHitbox, pushedHitbox);
      pushInfo.direction += Math.PI;
      return pushInfo;
   } else {
      // Rectangle + Rectangle
      
      assertBoxIsRectangular(pushedHitbox);
      assertBoxIsRectangular(pushingHitbox);
      
      // @Cleanup: copy and paste
      const collisionData = rectanglesAreColliding(pushedHitbox, pushingHitbox);
      if (!collisionData.isColliding) {
         // @HACK @INCOMPLETE
         console.warn("BAD.");
         return {
            amountIn: 0,
            direction: 0
         };
      }
      
      return {
         amountIn: collisionData.overlap,
         // @Hack
         direction: angle(collisionData.axisX, collisionData.axisY)
      };
   }
}

export function collisionBitsAreCompatible(collisionMask1: number, collisionBit1: number, collisionMask2: number, collisionBit2: number): boolean {
   return (collisionMask1 & collisionBit2) !== 0 && (collisionMask2 & collisionBit1) !== 0;
}