import { Box, HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { CollisionBit } from "../../shared/src/collision";
import Board from "./Board";
import { Entity } from "../../shared/src/entities";
import { Point } from "../../shared/src/utils";
import { Settings } from "../../shared/src/settings";
import { TILE_PHYSICS_INFO_RECORD, TileType } from "../../shared/src/tiles";
import { entityIsInRiver, getHitboxTile, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { getEntityLayer, getEntityRenderInfo } from "./world";
import { registerDirtyRenderInfo } from "./rendering/render-part-matrices";

export interface HitboxTether {
   readonly originBox: Box;

   readonly idealDistance: number;
   readonly springConstant: number;
   readonly damping: number;
}

export const enum HitboxParentType {
   transformComponent,
   hitbox
}

export interface Hitbox {
   readonly localID: number;

   readonly entity: Entity;
   rootEntity: Entity;

   parent: Hitbox | null;
   
   readonly children: Array<Hitbox>;

   readonly box: Box;
   
   readonly previousPosition: Point;
   readonly acceleration: Point;
   readonly tethers: Array<HitboxTether>;

   /** The angle the hitbox had last frame render. Just used to interpolate hitbox rotations. That's why this isn't present in the server definition */
   previousAngle: number;
   previousRelativeAngle: number;
   angularAcceleration: number;

   mass: number;
   collisionType: HitboxCollisionType;
   readonly collisionBit: CollisionBit;
   readonly collisionMask: number;
   readonly flags: ReadonlyArray<HitboxFlag>;

   isPartOfParent: boolean;
   isStatic: boolean;

   lastUpdateTicks: number;
}

export function createHitbox(localID: number, entity: Entity, rootEntity: Entity, parent: Hitbox | null, children: Array<Hitbox>, isPartOfParent: boolean, isStatic: boolean, box: Box, previousPosition: Point, acceleration: Point, tethers: Array<HitboxTether>, previousRelativeAngle: number, angularAcceleration: number, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox {
   return {
      localID: localID,
      entity: entity,
      rootEntity: rootEntity,
      parent: parent,
      children: children,
      box: box,
      previousPosition: previousPosition,
      acceleration: acceleration,
      tethers: tethers,
      previousAngle: box.angle,
      previousRelativeAngle: previousRelativeAngle,
      angularAcceleration: angularAcceleration,
      mass: mass,
      collisionType: collisionType,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      flags: flags,
      isPartOfParent: isPartOfParent,
      isStatic: isStatic,
      lastUpdateTicks: Board.serverTicks
   };
}

export function createHitboxQuick(localID: number, parent: Hitbox | null, box: Box, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox {
   return {
      localID: localID,
      // @HACK @INCOMPLETE (? maybe not)
      entity: 0,
      rootEntity: 0,
      parent: parent,
      isPartOfParent: true,
      isStatic: false,
      children: [],
      box: box,
      previousPosition: box.position.copy(),
      acceleration: new Point(0, 0),
      tethers: [],
      previousAngle: box.angle,
      previousRelativeAngle: box.relativeAngle,
      angularAcceleration: 0,
      mass: mass,
      collisionType: collisionType,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      flags: flags,
      lastUpdateTicks: Board.serverTicks
   };
}

export function getHitboxVelocity(hitbox: Hitbox): Point {
   const vx = (hitbox.box.position.x - hitbox.previousPosition.x) * Settings.TICK_RATE;
   const vy = (hitbox.box.position.y - hitbox.previousPosition.y) * Settings.TICK_RATE;
   return new Point(vx, vy);
}

export function setHitboxVelocityX(hitbox: Hitbox, vx: number): void {
   hitbox.previousPosition.x = hitbox.box.position.x - vx * Settings.DT_S;
}

export function setHitboxVelocityY(hitbox: Hitbox, vy: number): void {
   hitbox.previousPosition.y = hitbox.box.position.y - vy * Settings.DT_S;
}

export function setHitboxVelocity(hitbox: Hitbox, vx: number, vy: number): void {
   hitbox.previousPosition.x = hitbox.box.position.x - vx * Settings.DT_S;
   hitbox.previousPosition.y = hitbox.box.position.y - vy * Settings.DT_S;
}

export function getRootHitbox(hitbox: Hitbox): Hitbox {
   let currentHitbox = hitbox;
   while (currentHitbox.parent !== null) {
      currentHitbox = currentHitbox.parent;
   }
   return currentHitbox;
}

export function getHitboxTotalMassIncludingChildren(hitbox: Hitbox): number {
   let totalMass = hitbox.mass;
   for (const childHitbox of hitbox.children) {
      if (childHitbox.isPartOfParent) {
         totalMass += getHitboxTotalMassIncludingChildren(childHitbox);
      }
   }
   return totalMass;
}

export function addHitboxVelocity(hitbox: Hitbox, pushX: number, pushY: number): void {
   const pushedHitbox = getRootHitbox(hitbox);
   pushedHitbox.box.position.x += pushX * Settings.DT_S;
   pushedHitbox.box.position.y += pushY * Settings.DT_S;
}

export function translateHitbox(hitbox: Hitbox, translationX: number, translationY: number): void {
   const pushedHitbox = getRootHitbox(hitbox);
   pushedHitbox.box.position.x += translationX;
   pushedHitbox.box.position.y += translationY;
   pushedHitbox.previousPosition.x += translationX;
   pushedHitbox.previousPosition.y += translationY;
}

// @Cleanup: Passing in hitbox really isn't the best, ideally hitbox should self-contain all the necessary info... but is that really good? + memory efficient?
export function applyAccelerationFromGround(entity: Entity, hitbox: Hitbox, accelerationX: number, accelerationY: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   const tile = getHitboxTile(getEntityLayer(entity), hitbox);
   const tilePhysicsInfo = TILE_PHYSICS_INFO_RECORD[tile.type];
      
   let tileMoveSpeedMultiplier = tilePhysicsInfo.moveSpeedMultiplier;
   if (transformComponent.ignoredTileSpeedMultipliers.includes(tile.type) || (tile.type === TileType.water && !entityIsInRiver(transformComponent, entity))) {
      tileMoveSpeedMultiplier = 1;
   }
   
   // Calculate the desired velocity based on acceleration
   const friction = tilePhysicsInfo.friction;
   const desiredVelocityX = accelerationX * friction * tileMoveSpeedMultiplier;
   const desiredVelocityY = accelerationY * friction * tileMoveSpeedMultiplier;

   const currentVelocity = getHitboxVelocity(hitbox);
   
   // Apply velocity with traction (blend towards desired velocity)
   hitbox.acceleration.x += (desiredVelocityX - currentVelocity.x) * transformComponent.traction;
   hitbox.acceleration.y += (desiredVelocityY - currentVelocity.y) * transformComponent.traction;
}

/** Makes the hitboxes' angle be that as specified, by only changing its relative angle */
export function setHitboxAngle(hitbox: Hitbox, angle: number): void {
   const add = angle - hitbox.box.angle;
   hitbox.box.relativeAngle += add;
   hitbox.previousRelativeAngle += add;

   const renderInfo = getEntityRenderInfo(hitbox.entity);
   registerDirtyRenderInfo(renderInfo);
}

/** Makes the hitboxes' angle be that as specified, by only changing its relative angle */
export function setHitboxRelativeAngle(hitbox: Hitbox, angle: number): void {
   const add = angle - hitbox.box.relativeAngle;
   hitbox.box.relativeAngle += add;
   hitbox.previousRelativeAngle += add;

   const renderInfo = getEntityRenderInfo(hitbox.entity);
   registerDirtyRenderInfo(renderInfo);
}

export function applyForce(hitbox: Hitbox, force: Point): void {
   const rootHitbox = getRootHitbox(hitbox);
   if (!rootHitbox.isStatic) {
      const hitboxConnectedMass = getHitboxTotalMassIncludingChildren(rootHitbox);
      if (hitboxConnectedMass !== 0) {
         rootHitbox.acceleration.x += force.x / hitboxConnectedMass;
         rootHitbox.acceleration.y += force.y / hitboxConnectedMass;
      }
   }
}

export function setHitboxAngularVelocity(hitbox: Hitbox, angularVelocity: number): void {
   hitbox.previousRelativeAngle = hitbox.box.angle - angularVelocity * Settings.DT_S;
}

// export function getHitboxAngularVelocity(hitbox: Hitbox): number {
//    // Here we don't use getAngleDiff but just subtract them, so that e.g. adding 2pi to the relative angle will register as some angular velocity
//    // @INCOMPLETE @INVESTIGATE but the above comment is wrong??? we do just use getAngleDiff??
//    return getAngleDiff(hitbox.previousRelativeAngle, hitbox.box.relativeAngle) * Settings.TICK_RATE;
// }
// export function getHitboxRelativeAngularVelocity(hitbox: Hitbox): number {
//    // Here we don't use getAngleDiff but just subtract them, so that e.g. adding 2pi to the relative angle will register as some angular velocity
//    // @INCOMPLETE @INVESTIGATE but the above comment is wrong??? we do just use getAngleDiff??
//    return getAngleDiff(hitbox.previousRelativeAngle, hitbox.box.relativeAngle) * Settings.TICK_RATE;
// }