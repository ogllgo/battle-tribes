import { Box, HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { CollisionBit } from "../../shared/src/collision";
import Board from "./Board";
import { Entity } from "../../shared/src/entities";
import { Point } from "../../shared/src/utils";
import { Settings } from "../../shared/src/settings";
import { TILE_PHYSICS_INFO_RECORD, TileType } from "../../shared/src/tiles";
import { entityIsInRiver, getHitboxTile, TransformComponentArray, TransformNode } from "./entity-components/server-components/TransformComponent";
import { getEntityLayer } from "./world";
import { PhysicsComponentArray } from "./entity-components/server-components/PhysicsComponent";

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

   parent: Hitbox | null;
   
   readonly children: Array<TransformNode>;

   readonly box: Box;
   
   readonly previousPosition: Point;
   readonly acceleration: Point;
   readonly tethers: Array<HitboxTether>;

   previousRelativeAngle: number;
   angularAcceleration: number;

   mass: number;
   collisionType: HitboxCollisionType;
   readonly collisionBit: CollisionBit;
   readonly collisionMask: number;
   readonly flags: ReadonlyArray<HitboxFlag>;

   lastUpdateTicks: number;
}

export function createHitbox(localID: number, parent: Hitbox | null, box: Box, previousPosition: Point, acceleration: Point, tethers: Array<HitboxTether>, previousRelativeAngle: number, angularAcceleration: number, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox {
   return {
      localID: localID,
      parent: parent,
      children: [],
      box: box,
      previousPosition: previousPosition,
      acceleration: acceleration,
      tethers: tethers,
      previousRelativeAngle: previousRelativeAngle,
      angularAcceleration: angularAcceleration,
      mass: mass,
      collisionType: collisionType,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      flags: flags,
      lastUpdateTicks: Board.serverTicks
   };
}

export function createHitboxQuick(localID: number, parent: Hitbox | null, box: Box, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox {
   return {
      localID: localID,
      parent: parent,
      children: [],
      box: box,
      previousPosition: box.position.copy(),
      acceleration: new Point(0, 0),
      tethers: [],
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
   const vx = (hitbox.box.position.x - hitbox.previousPosition.x) * Settings.TPS;
   const vy = (hitbox.box.position.y - hitbox.previousPosition.y) * Settings.TPS;
   return new Point(vx, vy);
}

export function setHitboxVelocityX(hitbox: Hitbox, vx: number): void {
   hitbox.previousPosition.x = hitbox.box.position.x - vx / Settings.TPS;
}

export function setHitboxVelocityY(hitbox: Hitbox, vy: number): void {
   hitbox.previousPosition.y = hitbox.box.position.y - vy / Settings.TPS;
}

export function setHitboxVelocity(hitbox: Hitbox, vx: number, vy: number): void {
   hitbox.previousPosition.x = hitbox.box.position.x - vx / Settings.TPS;
   hitbox.previousPosition.y = hitbox.box.position.y - vy / Settings.TPS;
}

export function getRootHitbox(hitbox: Hitbox): Hitbox {
   let currentHitbox = hitbox;
   while (currentHitbox.parent !== null) {
      currentHitbox = currentHitbox.parent;
   }
   return currentHitbox;
}

export function addHitboxVelocity(hitbox: Hitbox, pushX: number, pushY: number): void {
   const pushedHitbox = getRootHitbox(hitbox);
   pushedHitbox.box.position.x += pushX / Settings.TPS;
   pushedHitbox.box.position.y += pushY / Settings.TPS;
}

export function translateHitbox(hitbox: Hitbox, translationX: number, translationY: number): void {
   const pushedHitbox = getRootHitbox(hitbox);
   pushedHitbox.box.position.x += translationX;
   pushedHitbox.box.position.y += translationY;
   hitbox.previousPosition.x += translationX;
   hitbox.previousPosition.y += translationY;
}

// @Cleanup: Passing in hitbox really isn't the best, ideally hitbox should self-contain all the necessary info... but is that really good? + memory efficient?
export function applyAcceleration(entity: Entity, hitbox: Hitbox, accelerationX: number, accelerationY: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   const tile = getHitboxTile(getEntityLayer(entity), hitbox);
   const tilePhysicsInfo = TILE_PHYSICS_INFO_RECORD[tile.type];
      
   let tileMoveSpeedMultiplier = tilePhysicsInfo.moveSpeedMultiplier;
   if (physicsComponent.ignoredTileSpeedMultipliers.includes(tile.type) || (tile.type === TileType.water && !entityIsInRiver(transformComponent, entity))) {
      tileMoveSpeedMultiplier = 1;
   }
   
   // Calculate the desired velocity based on acceleration
   const friction = tilePhysicsInfo.friction;
   const desiredVelocityX = accelerationX * friction * tileMoveSpeedMultiplier;
   const desiredVelocityY = accelerationY * friction * tileMoveSpeedMultiplier;

   const currentVelocity = getHitboxVelocity(hitbox);
   
   // Apply velocity with traction (blend towards desired velocity)
   hitbox.acceleration.x += (desiredVelocityX - currentVelocity.x) * physicsComponent.traction;
   hitbox.acceleration.y += (desiredVelocityY - currentVelocity.y) * physicsComponent.traction;
}

export function setHitboxAngularVelocity(hitbox: Hitbox, angularVelocity: number): void {
   hitbox.previousRelativeAngle = hitbox.box.angle - angularVelocity / Settings.TPS;
}