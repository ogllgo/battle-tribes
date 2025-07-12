import { Box, cloneBox, HitboxCollisionType, HitboxFlag } from "../../shared/src/boxes/boxes";
import { RIVER_STEPPING_STONE_SIZES } from "../../shared/src/client-server-types";
import { CollisionBit } from "../../shared/src/collision";
import { Entity, EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { TILE_PHYSICS_INFO_RECORD, TileType } from "../../shared/src/tiles";
import { assert, clampAngleA, getAngleDiff, getTileIndexIncludingEdges, Point, polarVec2, TileIndex } from "../../shared/src/utils";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { EntityAttachInfo, entityChildIsEntity, TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { registerPlayerKnockback } from "./server/player-clients";
import { HitboxTether } from "./tethers";
import { getEntityLayer, getEntityType } from "./world";

export interface HitboxAngularTether {
   readonly originHitbox: Hitbox;
   readonly idealAngle: number;
   readonly springConstant: number;
   readonly damping: number;
   /** Radians either side of the ideal angle for which the link is allowed to be in without being pulled */
   readonly padding: number;

   // @HACK: haven't fully thought this through; it's extremely unclear what this is
   readonly idealHitboxAngleOffset: number;
}

/** Puts an angular spring on the hitbox's relative angle. */
export interface HitboxRelativeAngleConstraint {
   readonly idealAngle: number;
   readonly springConstant: number;
   readonly damping: number;
}

export interface Hitbox {
   readonly localID: number;
   
   parent: Hitbox | null;
   readonly children: Array<Hitbox | EntityAttachInfo>;
   
   readonly box: Box;
   
   readonly previousPosition: Point;
   readonly acceleration: Point;
   // @Incomplete: make it impossible to add or remove from here
   readonly tethers: Array<HitboxTether>;
   
   previousRelativeAngle: number;
   angularAcceleration: number;
   // NOTE: Angular tethers only work correctly when the hitbox has a normalised pivot point of (0, -0.5)
   readonly angularTethers: Array<HitboxAngularTether>;
   readonly relativeAngleConstraints: Array<HitboxRelativeAngleConstraint>;
   
   mass: number;
   collisionType: HitboxCollisionType;
   readonly collisionBit: CollisionBit;
   // @Temporary: this isn't readonly so that snobes can temporarily not collide with snowballs when digging
   collisionMask: number;
   readonly flags: ReadonlyArray<HitboxFlag>;

   // @Memory: entities without physics components don't need these 4.
   boundsMinX: number;
   boundsMaxX: number;
   boundsMinY: number;
   boundsMaxY: number;
}

export function createHitbox(transformComponent: TransformComponent, parent: Hitbox | null, box: Box, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox {
   const localID = transformComponent.nextHitboxLocalID++;
   
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
      angularTethers: [],
      relativeAngleConstraints: [],
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

/** Returns a deep-clone of the hitbox. */
export function cloneHitbox(transformComponent: TransformComponent, hitbox: Hitbox): Hitbox {
   return createHitbox(transformComponent, hitbox.parent, cloneBox(hitbox.box), hitbox.mass, hitbox.collisionType, hitbox.collisionBit, hitbox.collisionMask, hitbox.flags);
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
   // @Bug: This can cause infinite loops. We should do a check here, or just rework the whole shitass system so this can never occur
   let currentHitbox = hitbox;
   while (currentHitbox.parent !== null) {
      currentHitbox = currentHitbox.parent;
   }
   return currentHitbox;
}

export function addHitboxVelocity(hitbox: Hitbox, addVec: Point): void {
   const pushedHitbox = getRootHitbox(hitbox);
   pushedHitbox.box.position.x += addVec.x / Settings.TPS;
   pushedHitbox.box.position.y += addVec.y / Settings.TPS;
}

export function translateHitbox(hitbox: Hitbox, transformComponent: TransformComponent, translation: Point): void {
   const pushedHitbox = getRootHitbox(hitbox);
   pushedHitbox.box.position.x += translation.x;
   pushedHitbox.box.position.y += translation.y;
   hitbox.previousPosition.x += translation.x;
   hitbox.previousPosition.y += translation.y;

   transformComponent.isDirty = true;
}

export function teleportHitbox(hitbox: Hitbox, transformComponent: TransformComponent, pos: Point): void {
   const pushedHitbox = getRootHitbox(hitbox);
   pushedHitbox.box.position.x = pos.x;
   pushedHitbox.box.position.y = pos.y;
   hitbox.previousPosition.x = pos.x;
   hitbox.previousPosition.y = pos.y;

   transformComponent.isDirty = true;
}

export function getTotalMass(node: Hitbox | Entity): number {
   let totalMass = 0;
   if (typeof node === "number") {
      const transformComponent = TransformComponentArray.getComponent(node);
      for (const child of transformComponent.children) {
         if (entityChildIsEntity(child)) {
            totalMass += getTotalMass(child.attachedEntity);
         } else {
            totalMass += getTotalMass(child);
         }
      }
   } else {
      const hitbox = node;
      totalMass += hitbox.mass;

      for (const child of hitbox.children) {
         if (entityChildIsEntity(child)) {
            totalMass += getTotalMass(child.attachedEntity);
         } else {
            totalMass += getTotalMass(child);
         }
      }
   }
   return totalMass;
}

export function getHitboxConnectedMass(hitbox: Hitbox): number {
   const rootHitbox = getRootHitbox(hitbox);
   return getTotalMass(rootHitbox);
}

export function applyKnockback(entity: Entity, hitbox: Hitbox, knockback: number, knockbackDirection: number): void {
   if (!PhysicsComponentArray.hasComponent(entity)) {
      return;
   }

   // @Speed: should take in knockback as knockbackX and knockbackY instead of in polar form...

   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if (physicsComponent.isImmovable) {
      return;
   }
   
   const totalMass = getHitboxConnectedMass(hitbox);
   assert(totalMass !== 0);
   const knockbackForce = knockback / totalMass;

   const rootHitbox = getRootHitbox(hitbox);
   addHitboxVelocity(rootHitbox, polarVec2(knockbackForce, knockbackDirection));

   // @Hack?
   if (getEntityType(entity) === EntityType.player) {
      registerPlayerKnockback(entity, knockback, knockbackDirection);
   }
}

// @Cleanup: Should be combined with previous function
export function applyAbsoluteKnockback(entity: Entity, hitbox: Hitbox, knockback: Point): void {
   if (!PhysicsComponentArray.hasComponent(entity)) {
      return;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if (physicsComponent.isImmovable) {
      return;
   }
   
   const rootHitbox = getRootHitbox(hitbox);
   addHitboxVelocity(rootHitbox, knockback);

   // @Hack?
   if (getEntityType(entity) === EntityType.player) {
      // @Hack
      const polarKnockback = knockback.convertToVector();
      registerPlayerKnockback(entity, polarKnockback.magnitude, polarKnockback.direction);
   }
}

// @Cleanup: Passing in hitbox really isn't the best, ideally hitbox should self-contain all the necessary info... but is that really good? + memory efficient?
export function applyAccelerationFromGround(entity: Entity, hitbox: Hitbox, acceleration: Point): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   const tileIndex = getHitboxTile(hitbox);
   const tileType = getEntityLayer(entity).getTileType(tileIndex);
   const tilePhysicsInfo = TILE_PHYSICS_INFO_RECORD[tileType];
   
   // @Speed: very complicated logic
   let moveSpeedMultiplier: number;
   if (physicsComponent.overrideMoveSpeedMultiplier || !physicsComponent.isAffectedByGroundFriction) {
      moveSpeedMultiplier = 1;
   } else if (tileType === TileType.water && !hitboxIsInRiver(entity, hitbox)) {
      moveSpeedMultiplier = physicsComponent.moveSpeedMultiplier;
   } else {
      moveSpeedMultiplier = tilePhysicsInfo.moveSpeedMultiplier * physicsComponent.moveSpeedMultiplier;
   }

   // Calculate the desired velocity based on acceleration
   const tileFriction = tilePhysicsInfo.friction;
   const desiredVelocityX = acceleration.x * tileFriction * moveSpeedMultiplier;
   const desiredVelocityY = acceleration.y * tileFriction * moveSpeedMultiplier;

   const currentVelocity = getHitboxVelocity(hitbox);

   hitbox.acceleration.x += (desiredVelocityX - currentVelocity.x) * physicsComponent.traction;
   hitbox.acceleration.y += (desiredVelocityY - currentVelocity.y) * physicsComponent.traction;
}

export function applyAcceleration(hitbox: Hitbox, acc: Point): void {
   hitbox.acceleration.x += acc.x;
   hitbox.acceleration.y += acc.y;
}

/** Makes the hitboxes' angle be that as specified, by only changing its relative angle */
export function setHitboxAngle(hitbox: Hitbox, angle: number): void {
   const add = angle - hitbox.box.angle;
   hitbox.box.relativeAngle += add;
   hitbox.previousRelativeAngle += add;
}

const cleanAngle = (hitbox: Hitbox): void => {
   // Clamp angle to [-PI, PI) range
   if (hitbox.box.angle < -Math.PI) {
      hitbox.box.angle += Math.PI * 2;
   } else if (hitbox.box.angle >= Math.PI) {
      hitbox.box.angle -= Math.PI * 2;
   }
}

const cleanRelativeAngle = (hitbox: Hitbox): void => {
   // Clamp angle to [-PI, PI) range
   if (hitbox.box.relativeAngle < -Math.PI) {
      hitbox.box.relativeAngle += Math.PI * 2;
   } else if (hitbox.box.relativeAngle >= Math.PI) {
      hitbox.box.relativeAngle -= Math.PI * 2;
   }
}

export function getHitboxAngularVelocity(hitbox: Hitbox): number {
   // Here we don't use getAngleDiff but just subtract them, so that e.g. adding 2pi to the relative angle will register as some angular velocity
   // return 
   return getAngleDiff(hitbox.previousRelativeAngle, hitbox.box.relativeAngle) * Settings.TPS;
}

export function addHitboxAngularVelocity(hitbox: Hitbox, angularVelocity: number): void {
   hitbox.box.relativeAngle += angularVelocity / Settings.TPS;
}

export function addHitboxAngularAcceleration(hitbox: Hitbox, acceleration: number): void {
   hitbox.angularAcceleration += acceleration;
}

export function turnHitboxToAngle(hitbox: Hitbox, idealAngle: number, turnSpeed: number, damping: number, idealAngleIsRelative: boolean): void {
   cleanAngle(hitbox);
   cleanRelativeAngle(hitbox);

   let idealRelativeAngle: number;
   if (idealAngleIsRelative) {
      idealRelativeAngle = idealAngle;
   } else {
      const parentAngle = hitbox.box.angle - hitbox.box.relativeAngle;
      idealRelativeAngle = idealAngle - parentAngle;
   }
      
   const angleDiff = getAngleDiff(hitbox.box.relativeAngle, idealRelativeAngle);
   const springForce = angleDiff * turnSpeed; // 'turn speed' is really a spring constant now
   
   const angularVelocity = getHitboxAngularVelocity(hitbox);
   const dampingForce = -angularVelocity * damping;

   hitbox.angularAcceleration += springForce + dampingForce;
}

export function getHitboxTile(hitbox: Hitbox): TileIndex {
   const tileX = Math.floor(hitbox.box.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(hitbox.box.position.y / Settings.TILE_SIZE);
   return getTileIndexIncludingEdges(tileX, tileY);
}

// @Cleanup: having to pass in entity is SHIT!
export function hitboxIsInRiver(entity: Entity, hitbox: Hitbox): boolean {
   const tileIndex = getHitboxTile(hitbox);
   const layer = getEntityLayer(entity);

   const tileType = layer.tileTypes[tileIndex];
   if (tileType !== TileType.water) {
      return false;
   }

   if (PhysicsComponentArray.hasComponent(entity)) {
      const physicsComponent = PhysicsComponentArray.getComponent(entity);
      if (!physicsComponent.isAffectedByGroundFriction) {
         return false;
      }
   }

   // If the entity is standing on a stepping stone they aren't in a river
   // @Speed: we only need to check the chunks the hitbox is in
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (const chunk of transformComponent.chunks) {
      for (const steppingStone of chunk.riverSteppingStones) {
         const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
         
         const distX = hitbox.box.position.x - steppingStone.positionX;
         const distY = hitbox.box.position.y - steppingStone.positionY;
         if (distX * distX + distY * distY <= size * size / 4) {
            return false;
         }
      }
   }

   return true;
}