import { Box, HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { CollisionBit } from "../../shared/src/collision";
import Board from "./Board";
import { Entity } from "../../shared/src/entities";
import { Point } from "../../shared/src/utils";
import { Settings } from "../../shared/src/settings";
import { TILE_MOVE_SPEED_MULTIPLIERS, TileType, TILE_FRICTIONS } from "../../shared/src/tiles";
import { entityIsInRiver, getHitboxTile, TransformComponentArray, TransformNode } from "./entity-components/server-components/TransformComponent";
import { getEntityLayer } from "./world";
import { PhysicsComponentArray } from "./entity-components/server-components/PhysicsComponent";

export const enum HitboxParentType {
   transformComponent,
   hitbox
}

export interface Hitbox {
   readonly localID: number;

   parent: Hitbox | null;
   
   readonly children: Array<TransformNode>;

   readonly box: Box;
   
   readonly velocity: Point;

   idealAngle: number;
   angleTurnSpeed: number;

   mass: number;
   collisionType: HitboxCollisionType;
   readonly collisionBit: CollisionBit;
   readonly collisionMask: number;
   readonly flags: ReadonlyArray<HitboxFlag>;

   lastUpdateTicks: number;
}

export function createHitbox(localID: number, parent: Hitbox | null, box: Box, velocity: Point, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox {
   return {
      localID: localID,
      parent: parent,
      children: [],
      box: box,
      velocity: velocity,
      idealAngle: 0,
      angleTurnSpeed: 0,
      mass: mass,
      collisionType: collisionType,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      flags: flags,
      lastUpdateTicks: Board.serverTicks
   };
}

// @Cleanup: Passing in hitbox really isn't the best, ideally hitbox should self-contain all the necessary info... but is that really good? + memory efficient?
export function applyAcceleration(entity: Entity, hitbox: Hitbox, accelerationX: number, accelerationY: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   const tile = getHitboxTile(getEntityLayer(entity), hitbox);
      
   let tileMoveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[tile.type];
   if (physicsComponent.ignoredTileSpeedMultipliers.includes(tile.type) || (tile.type === TileType.water && !entityIsInRiver(transformComponent, entity))) {
      tileMoveSpeedMultiplier = 1;
   }

   const friction = TILE_FRICTIONS[tile.type];

   // Calculate the desired velocity based on acceleration
   const desiredVelocityX = accelerationX * friction * tileMoveSpeedMultiplier;
   const desiredVelocityY = accelerationY * friction * tileMoveSpeedMultiplier;

   // Apply velocity with traction (blend towards desired velocity)
   hitbox.velocity.x += (desiredVelocityX - hitbox.velocity.x) * physicsComponent.traction * Settings.I_TPS;
   hitbox.velocity.y += (desiredVelocityY - hitbox.velocity.y) * physicsComponent.traction * Settings.I_TPS;
}

export function setHitboxAngularVelocity(hitbox: Hitbox, angularVelocity: number): void {
   hitbox.idealAngle = -999;
   hitbox.angleTurnSpeed = angularVelocity;
}