import { Box, cloneBox, HitboxCollisionType, HitboxFlag } from "../../shared/src/boxes/boxes";
import { RIVER_STEPPING_STONE_SIZES } from "../../shared/src/client-server-types";
import { CollisionBit } from "../../shared/src/collision";
import { Entity, EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { TILE_PHYSICS_INFO_RECORD, TileType } from "../../shared/src/tiles";
import { assert, getAngleDiff, getTileIndexIncludingEdges, Point, polarVec2, TileIndex } from "../../shared/src/utils";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
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

export class Hitbox {
   public readonly localID: number;

   // THESE BOTH START AT 0 BUT WILL BE FILLED BY THE TRANSFORM COMPONENT'S INITIALISATION
   /** The entity the hitbox belongs to. */
   // @Cleanup would be really nice to make the entity field readonly, but rn it has to be set when it's initialised so idk how that would work
   public entity: Entity = 0;
   public rootEntity: Entity = 0;
   
   public parent: Hitbox | null;
   /** If true, the hitbox will be considered like it and its parent are part of the same thing, regardless even of if they belong to different entities. */
   public isPartOfParent: boolean;

   public readonly children = new Array<Hitbox>();
   
   public readonly box: Box;
   
   public readonly previousPosition: Point;
   public readonly acceleration = new Point(0, 0);
   // @Incomplete: make it impossible to add or remove from here
   public readonly tethers = new Array<HitboxTether>();
   
   public previousRelativeAngle: number;
   public angularAcceleration = 0;
   public readonly angularTethers = new Array<HitboxAngularTether>();
   public readonly relativeAngleConstraints = new Array<HitboxRelativeAngleConstraint>();
   
   public mass: number;
   public collisionType: HitboxCollisionType;
   public readonly collisionBit: CollisionBit;
   // @Temporary: this isn't readonly so that snobes can temporarily not collide with snowballs when digging
   public collisionMask: number;
   public readonly flags: ReadonlyArray<HitboxFlag>;

   // @Memory: entities without physics components don't need these 4.
   public boundsMinX = 0;
   public boundsMaxX = 0;
   public boundsMinY = 0;
   public boundsMaxY = 0;

   /** If true, the entity will not be pushed around by collisions or be able to be moved. */
   public isStatic = false;

   constructor(transformComponent: TransformComponent, parent: Hitbox | null, isPartOfParent: boolean, box: Box, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>) {
      this.localID = transformComponent.nextHitboxLocalID++;
      this.parent = parent;
      this.isPartOfParent = isPartOfParent;
      this.box = box;
   
      this.previousPosition = box.position.copy();
      this.previousRelativeAngle = box.relativeAngle;

      this.mass = mass;
      this.collisionType = collisionType;
      this.collisionBit = collisionBit;
      this.collisionMask = collisionMask;
      this.flags = flags;
   }
}

/** Returns a deep-clone of the hitbox. */
export function cloneHitbox(transformComponent: TransformComponent, hitbox: Hitbox): Hitbox {
   return new Hitbox(transformComponent, hitbox.parent, hitbox.isPartOfParent, cloneBox(hitbox.box), hitbox.mass, hitbox.collisionType, hitbox.collisionBit, hitbox.collisionMask, hitbox.flags);
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
   const rootHitbox = getRootHitbox(hitbox);
   if (!rootHitbox.isStatic) {
      rootHitbox.box.position.x += addVec.x / Settings.TPS;
      rootHitbox.box.position.y += addVec.y / Settings.TPS;
   }
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

export function getHitboxTotalMassIncludingChildren(hitbox: Hitbox): number {
   let totalMass = hitbox.mass;
   for (const childHitbox of hitbox.children) {
      if (childHitbox.isPartOfParent) {
         totalMass += getHitboxTotalMassIncludingChildren(childHitbox);
      }
   }
   return totalMass;
}

export function getHitboxConnectedMass(hitbox: Hitbox): number {
   const rootHitbox = getRootHitbox(hitbox);
   return getHitboxTotalMassIncludingChildren(rootHitbox);
}

export function applyKnockback(hitbox: Hitbox, knockback: number, knockbackDirection: number): void {
   // @CLEANUP this is literally just addHItboxVelocity, but also registering it to the player.....
   
   const rootHitbox = getRootHitbox(hitbox);
   if (rootHitbox.isStatic) {
      return;
   }

   // @Speed: should take in knockback as knockbackX and knockbackY instead of in polar form...

   const totalMass = getHitboxConnectedMass(rootHitbox);
   if (totalMass === 0) {
      return;
   }
   const knockbackForce = knockback / totalMass;
   addHitboxVelocity(rootHitbox, polarVec2(knockbackForce, knockbackDirection));

   // @Hack?
   if (getEntityType(hitbox.entity) === EntityType.player) {
      registerPlayerKnockback(hitbox.entity, knockback, knockbackDirection);
   }
}

// @Cleanup: Should be combined with previous function
export function applyAbsoluteKnockback(hitbox: Hitbox, knockback: Point): void {
   const rootHitbox = getRootHitbox(hitbox);
   if (rootHitbox.isStatic) {
      return;
   }

   addHitboxVelocity(rootHitbox, knockback);

   // @Hack?
   if (getEntityType(hitbox.entity) === EntityType.player) {
      // @Hack
      const polarKnockback = knockback.convertToVector();
      registerPlayerKnockback(hitbox.entity, polarKnockback.magnitude, polarKnockback.direction);
   }
}

export function applyAcceleration(hitbox: Hitbox, acc: Point): void {
   const rootHitbox = getRootHitbox(hitbox);
   if (!rootHitbox.isStatic) {
      rootHitbox.acceleration.x += acc.x;
      rootHitbox.acceleration.y += acc.y;
   }
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

// @Cleanup: Passing in hitbox really isn't the best, ideally hitbox should self-contain all the necessary info... but is that really good? + memory efficient?
export function applyAccelerationFromGround(hitbox: Hitbox, acceleration: Point): void {
   const entity = hitbox.entity;
   
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   const tileIndex = getHitboxTile(hitbox);
   const tileType = getEntityLayer(entity).getTileType(tileIndex);
   const tilePhysicsInfo = TILE_PHYSICS_INFO_RECORD[tileType];
   
   // @Speed: very complicated logic
   let moveSpeedMultiplier: number;
   if (physicsComponent.overrideMoveSpeedMultiplier || !physicsComponent.isAffectedByGroundFriction) {
      moveSpeedMultiplier = 1;
   } else if (tileType === TileType.water && !hitboxIsInRiver(hitbox)) {
      moveSpeedMultiplier = physicsComponent.moveSpeedMultiplier;
   } else {
      moveSpeedMultiplier = tilePhysicsInfo.moveSpeedMultiplier * physicsComponent.moveSpeedMultiplier;
   }

   // Calculate the desired velocity based on acceleration
   const tileFriction = tilePhysicsInfo.friction;
   const desiredVelocityX = acceleration.x * tileFriction * moveSpeedMultiplier;
   const desiredVelocityY = acceleration.y * tileFriction * moveSpeedMultiplier;

   const currentVelocity = getHitboxVelocity(hitbox);

   applyAcceleration(hitbox, new Point((desiredVelocityX - currentVelocity.x) * physicsComponent.traction, (desiredVelocityY - currentVelocity.y) * physicsComponent.traction));
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

export function hitboxIsInRiver(hitbox: Hitbox): boolean {
   const entity = hitbox.entity;
   
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