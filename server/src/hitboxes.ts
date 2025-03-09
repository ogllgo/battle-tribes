import { Box, cloneBox, HitboxCollisionType, HitboxFlag } from "../../shared/src/boxes/boxes";
import { HitboxCollisionBit } from "../../shared/src/collision";
import { Entity, EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { TileType, TILE_MOVE_SPEED_MULTIPLIERS, TILE_FRICTIONS } from "../../shared/src/tiles";
import { assert, Point } from "../../shared/src/utils";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { EntityAttachInfo, entityChildIsEntity, getHitboxTile, TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { registerPlayerKnockback } from "./server/player-clients";
import { getEntityLayer, getEntityType } from "./world";

export interface Hitbox {
   readonly localID: number;
   
   parent: Hitbox | null;
   readonly children: Array<Hitbox | EntityAttachInfo>;
   
   readonly box: Box;
   
   readonly velocity: Point;

   // @Memory: So many hitboxes don't use these 2!
   /** Angle the entity will try to turn towards. SHOULD ALWAYS BE IN RANGE [-PI, PI)
    *  Exception: when set to -999, the hitbox will take angleTurnSpeed as an angular velocity value instead. */
   idealAngle: number;
   angleTurnSpeed: number;
   
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

export function createHitbox(transformComponent: TransformComponent, parent: Hitbox | null, box: Box, mass: number, collisionType: HitboxCollisionType, collisionBit: HitboxCollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox {
   const localID = transformComponent.nextHitboxLocalID++;
   
   return {
      localID: localID,
      parent: parent,
      children: [],
      box: box,
      velocity: new Point(0, 0),
      idealAngle: -999,
      angleTurnSpeed: 0,
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

export function slowVelocity(hitbox: Hitbox, slowUnits: number): void {
   const velocityMagnitude = hitbox.velocity.length();

   if (velocityMagnitude > 0) {
      const reduction = Math.min(slowUnits, velocityMagnitude);
      hitbox.velocity.x -= reduction * hitbox.velocity.x / velocityMagnitude;
      hitbox.velocity.y -= reduction * hitbox.velocity.y / velocityMagnitude;
   }
}

/** Gets the root hitbox of an attached hitbox */
const getRootHitbox = (hitbox: Hitbox): Hitbox => {
   let currentHitbox = hitbox;
   while (currentHitbox.parent !== null) {
      currentHitbox = currentHitbox.parent;
   }
   return currentHitbox;
}

const getTotalMass = (node: Hitbox | Entity): number => {
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
   rootHitbox.velocity.x += knockbackForce * Math.sin(knockbackDirection);
   rootHitbox.velocity.y += knockbackForce * Math.cos(knockbackDirection);

   // @Hack?
   if (getEntityType(entity) === EntityType.player) {
      registerPlayerKnockback(entity, knockback, knockbackDirection);
   }
}

// @Cleanup: Should be combined with previous function
export function applyAbsoluteKnockback(entity: Entity, hitbox: Hitbox, knockback: number, knockbackDirection: number): void {
   if (!PhysicsComponentArray.hasComponent(entity)) {
      return;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if (physicsComponent.isImmovable) {
      return;
   }
   
   const rootHitbox = getRootHitbox(hitbox);
   rootHitbox.velocity.x += knockback * Math.sin(knockbackDirection);
   rootHitbox.velocity.y += knockback * Math.cos(knockbackDirection);

   // @Hack?
   if (getEntityType(entity) === EntityType.player) {
      registerPlayerKnockback(entity, knockback, knockbackDirection);
   }
}

// @Cleanup: Passing in hitbox really isn't the best, ideally hitbox should self-contain all the necessary info... but is that really good? + memory efficient?
export function applyAcceleration(entity: Entity, hitbox: Hitbox, accelerationX: number, accelerationY: number): void {
   // @Speed: Just for inRiver...
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   
   const tileIndex = getHitboxTile(hitbox);
   const tileType = getEntityLayer(entity).tileTypes[tileIndex];
      
   // @Speed: very complicated logic
   let moveSpeedMultiplier: number;
   if (physicsComponent.overrideMoveSpeedMultiplier || !physicsComponent.isAffectedByGroundFriction) {
      moveSpeedMultiplier = 1;
   } else if (tileType === TileType.water && !transformComponent.isInRiver) {
      moveSpeedMultiplier = physicsComponent.moveSpeedMultiplier;
   } else {
      moveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[tileType] * physicsComponent.moveSpeedMultiplier;
   }

   const tileFriction = TILE_FRICTIONS[tileType];
   
   // Calculate the desired velocity based on acceleration
   const desiredVelocityX = accelerationX * tileFriction * moveSpeedMultiplier;
   const desiredVelocityY = accelerationY * tileFriction * moveSpeedMultiplier;

   // Apply velocity with traction (blend towards desired velocity)
   hitbox.velocity.x += (desiredVelocityX - hitbox.velocity.x) * physicsComponent.traction * Settings.I_TPS;
   hitbox.velocity.y += (desiredVelocityY - hitbox.velocity.y) * physicsComponent.traction * Settings.I_TPS;
}

export function setHitboxIdealAngle(hitbox: Hitbox, idealAngle: number, angleTurnSpeed: number): void {
   hitbox.idealAngle = idealAngle;
   hitbox.angleTurnSpeed = angleTurnSpeed;
}

export function stopHitboxTurning(hitbox: Hitbox): void {
   hitbox.idealAngle = -999;
   hitbox.angleTurnSpeed = 0;
}

export function setHitboxAngularVelocity(hitbox: Hitbox, angularVelocity: number): void {
   hitbox.idealAngle = -999;
   hitbox.angleTurnSpeed = angularVelocity;
}