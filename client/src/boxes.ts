import { BoxFromType, BoxType, Hitbox, HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { HitboxCollisionBit } from "../../shared/src/collision";
import Board from "./Board";

export class ClientHitbox<T extends BoxType = BoxType> implements Hitbox<T> {
   public readonly box: BoxFromType[T];
   public readonly localID: number;

   public mass: number;
   public collisionType: HitboxCollisionType;
   public readonly collisionBit: HitboxCollisionBit;
   public readonly collisionMask: number;
   public readonly flags: ReadonlyArray<HitboxFlag>;

   public lastUpdateTicks = Board.serverTicks;

   // @Cleanup: unused, all of these?
   public boundsMinX = 0;
   public boundsMaxX = 0;
   public boundsMinY = 0;
   public boundsMaxY = 0;

   constructor(box: BoxFromType[T], mass: number, collisionType: HitboxCollisionType, collisionBit: HitboxCollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>, localID: number) {
      this.box = box;
      this.localID = localID;
      this.mass = mass;
      this.collisionType = collisionType;
      this.collisionBit = collisionBit;
      this.collisionMask = collisionMask;
      this.flags = flags;
   }
}