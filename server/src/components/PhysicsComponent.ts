import { Settings } from "battletribes-shared/settings";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType, EntityTypeString } from "battletribes-shared/entities";
import { TileType, TILE_MOVE_SPEED_MULTIPLIERS, TILE_FRICTIONS } from "battletribes-shared/tiles";
import { ComponentArray } from "./ComponentArray";
import { entityCanBlockPathfinding } from "../pathfinding";
import { Point, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { registerDirtyEntity, registerPlayerKnockback } from "../server/player-clients";
import { EntityCarryInfo, getEntityTile, resolveBorderCollisions, TransformComponent, TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { changeEntityLayer, getEntityLayer, getEntityType } from "../world";
import { undergroundLayer } from "../layers";
import { updateEntityLights } from "../light-levels";
import { Hitbox } from "../../../shared/src/boxes/boxes";

// @Cleanup: Variable names
const a = [0];
const b = [0];
for (let i = 0; i < 8; i++) {
   const angle = i / 4 * Math.PI;
   a.push(Math.sin(angle));
   b.push(Math.cos(angle));
}

/** Allows an entity to dynamically move its position around */
export class PhysicsComponent {
   public acceleration = new Point(0, 0);

   public turnSpeed = 0;
   /** Rotation the entity will try to turn towards. SHOULD ALWAYS BE IN RANGE [-PI, PI) */
   public targetRotation = 0;
   /** Can be negative. Unaffected by target rotation */
   public angularVelocity = 0;
   
   public moveSpeedMultiplier = 1;

   /** The higher this number is the faster the entity reaches its maximum speed. 1 = normal */
   public traction = 1;

   // @Cleanup: Might be able to be put on the physics component
   public overrideMoveSpeedMultiplier = false;

   public isAffectedByAirFriction = true;
   public isAffectedByGroundFriction = true;

   /** If true, the entity will not be pushed around by collisions, but will still call any relevant events. */
   public isImmovable = false;
}

export const PhysicsComponentArray = new ComponentArray<PhysicsComponent>(ServerComponentType.physics, true, getDataLength, addDataToPacket);
PhysicsComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const cleanRotation = (transformComponent: TransformComponent): void => {
   // Clamp rotation to [-PI, PI) range
   if (transformComponent.relativeRotation < -Math.PI) {
      transformComponent.relativeRotation += Math.PI * 2;
   } else if (transformComponent.relativeRotation >= Math.PI) {
      transformComponent.relativeRotation -= Math.PI * 2;
   }
}

const turnEntity = (entity: Entity, transformComponent: TransformComponent, physicsComponent: PhysicsComponent): void => {
   const previousRotation = transformComponent.relativeRotation;

   transformComponent.relativeRotation += physicsComponent.angularVelocity * Settings.I_TPS;
   cleanRotation(transformComponent);
   
   if (physicsComponent.turnSpeed !== 0) {
      let clockwiseDist = physicsComponent.targetRotation - transformComponent.relativeRotation;
      if (clockwiseDist < 0) {
         clockwiseDist += 2 * Math.PI;
      } else if (clockwiseDist >= 2 * Math.PI) {
         clockwiseDist -= 2 * Math.PI;
      }

      // @Temporary?
      if (clockwiseDist < 0 || clockwiseDist > 2 * Math.PI) {
         console.warn("BAD ROTATION!!!", physicsComponent.targetRotation, transformComponent.relativeRotation, physicsComponent.targetRotation - transformComponent.relativeRotation, clockwiseDist, 2 * Math.PI);
      }
      
      if (clockwiseDist <= Math.PI) {  
         transformComponent.relativeRotation += physicsComponent.turnSpeed * Settings.I_TPS;
         // If the entity would turn past the target direction, snap back to the target direction
         if (physicsComponent.turnSpeed * Settings.I_TPS > clockwiseDist) {
            transformComponent.relativeRotation = physicsComponent.targetRotation;
         }
      } else {
         const anticlockwiseDist = 2 * Math.PI - clockwiseDist;
         
         transformComponent.relativeRotation -= physicsComponent.turnSpeed * Settings.I_TPS
         // If the entity would turn past the target direction, snap back to the target direction
         if (physicsComponent.turnSpeed * Settings.I_TPS > anticlockwiseDist) {
            transformComponent.relativeRotation = physicsComponent.targetRotation;
         }
      }
   }

   if (transformComponent.relativeRotation !== previousRotation) {
      cleanRotation(transformComponent);

      transformComponent.isDirty = true;
      registerDirtyEntity(entity);
   }
}

const applyPhysics = (entity: Entity, transformComponent: TransformComponent, physicsComponent: PhysicsComponent): void => {
   // @Speed: There are a whole bunch of conditions in here which rely on physicsComponent.isAffectedByFriction,
   // which is only set at the creation of an entity. To remove these conditions we could probably split the physics
   // entities into two groups, and call two different applyPhysicsFriction and applyPhysicsNoFriction functions to
   // the corresponding groups
   
   // @Temporary @Hack
   if (isNaN(transformComponent.selfVelocity.x) || isNaN(transformComponent.selfVelocity.y)) {
      console.warn("Entity type " + EntityTypeString[getEntityType(entity)] + " velocity was NaN.");
      transformComponent.selfVelocity.x = 0;
      transformComponent.selfVelocity.y = 0;
   }

   const layer = getEntityLayer(entity);
   
   const tileIndex = getEntityTile(transformComponent);
   const tileType = layer.tileTypes[tileIndex];

   // Apply acceleration
   if (physicsComponent.acceleration.x !== 0 || physicsComponent.acceleration.y !== 0) {
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
      const desiredVelocityX = physicsComponent.acceleration.x * tileFriction * moveSpeedMultiplier;
      const desiredVelocityY = physicsComponent.acceleration.y * tileFriction * moveSpeedMultiplier;

      // Apply velocity with traction (blend towards desired velocity)
      transformComponent.selfVelocity.x += (desiredVelocityX - transformComponent.selfVelocity.x) * physicsComponent.traction * Settings.I_TPS;
      transformComponent.selfVelocity.y += (desiredVelocityY - transformComponent.selfVelocity.y) * physicsComponent.traction * Settings.I_TPS;
   }

   // If the game object is in a river, push them in the flow direction of the river
   // The tileMoveSpeedMultiplier check is so that game objects on stepping stones aren't pushed
   if (transformComponent.isInRiver && !physicsComponent.overrideMoveSpeedMultiplier && physicsComponent.isAffectedByGroundFriction) {
      const flowDirectionIdx = layer.riverFlowDirections[tileIndex];
      transformComponent.externalVelocity.x += 240 * Settings.I_TPS * a[flowDirectionIdx];
      transformComponent.externalVelocity.y += 240 * Settings.I_TPS * b[flowDirectionIdx];
   }

   let shouldUpdate = false;
   
   // Apply friction to self-velocity
   if (transformComponent.selfVelocity.x !== 0 || transformComponent.selfVelocity.y !== 0) {
      const friction = TILE_FRICTIONS[tileType];
      
      if (physicsComponent.isAffectedByAirFriction) {
         // Air friction
         transformComponent.selfVelocity.x *= 1 - friction * Settings.I_TPS * 2;
         transformComponent.selfVelocity.y *= 1 - friction * Settings.I_TPS * 2;
      }

      if (physicsComponent.isAffectedByGroundFriction) {
         // @Incomplete @Bug: Doesn't take into account the TPS. Would also be fixed by pre-multiplying the array
         // Ground friction
         const selfVelocityMagnitude = transformComponent.selfVelocity.length();
         if (selfVelocityMagnitude > 0) {
            const groundFriction = Math.min(friction, selfVelocityMagnitude);
            transformComponent.selfVelocity.x -= groundFriction * transformComponent.selfVelocity.x / selfVelocityMagnitude;
            transformComponent.selfVelocity.y -= groundFriction * transformComponent.selfVelocity.y / selfVelocityMagnitude;
         }
      }

      shouldUpdate = true;
   }

   // Apply friction to external velocity
   if (transformComponent.externalVelocity.x !== 0 || transformComponent.externalVelocity.y !== 0) {
      const friction = TILE_FRICTIONS[tileType];
      
      if (physicsComponent.isAffectedByAirFriction) {
         // Air friction
         transformComponent.externalVelocity.x *= 1 - friction * Settings.I_TPS * 2;
         transformComponent.externalVelocity.y *= 1 - friction * Settings.I_TPS * 2;
      }

      if (physicsComponent.isAffectedByGroundFriction) {
         // @Incomplete @Bug: Doesn't take into acount the TPS. Would also be fixed by pre-multiplying the array
         // Ground friction
         const externalVelocityMagnitude = transformComponent.externalVelocity.length();
         if (externalVelocityMagnitude > 0) {
            const groundFriction = Math.min(friction, externalVelocityMagnitude);
            transformComponent.externalVelocity.x -= groundFriction * transformComponent.externalVelocity.x / externalVelocityMagnitude;
            transformComponent.externalVelocity.y -= groundFriction * transformComponent.externalVelocity.y / externalVelocityMagnitude;
         }
      }

      shouldUpdate = true;
   }

   if (shouldUpdate) {
      // Update position based on the sum of self-velocity and external velocity
      transformComponent.position.x += (transformComponent.selfVelocity.x + transformComponent.externalVelocity.x) * Settings.I_TPS;
      transformComponent.position.y += (transformComponent.selfVelocity.y + transformComponent.externalVelocity.y) * Settings.I_TPS;

      transformComponent.isDirty = true;
      registerDirtyEntity(entity);
   }
}

const dirtifyPathfindingNodes = (entity: Entity, transformComponent: TransformComponent): void => {
   if (entityCanBlockPathfinding(entity)) {
      transformComponent.pathfindingNodesAreDirty = true;
   }
}

const updatePosition = (entity: Entity, transformComponent: TransformComponent): void => {
   if (transformComponent.isDirty) {
      transformComponent.cleanHitboxes(entity);
      transformComponent.isDirty = false;

      // @Correctness: Is this correct? Or should we dirtify these things wherever the isDirty flag is set?
      dirtifyPathfindingNodes(entity, transformComponent);
      registerDirtyEntity(entity);

      // (Potentially introduces dirt)
      transformComponent.resolveWallCollisions(entity);

      // If the object moved due to resolving wall tile collisions, recalculate
      if (transformComponent.isDirty) {
         transformComponent.cleanHitboxes(entity);
         registerDirtyEntity(entity);
      }

      // (Potentially introduces dirt)
      resolveBorderCollisions(transformComponent);
   
      // If the object moved due to resolving border collisions, recalculate
      if (transformComponent.isDirty) {
         transformComponent.cleanHitboxes(entity);
         registerDirtyEntity(entity);
      }

      transformComponent.updateIsInRiver(entity);

      // Check to see if the entity has descended into the underground layer
      const entityType = getEntityType(entity);
      if (entityType !== EntityType.guardian && entityType !== EntityType.guardianSpikyBall) {
         // Update the last valid layer
         const layer = getEntityLayer(entity);
         const tileIndex = getEntityTile(transformComponent);
         if (layer.getTileType(tileIndex) !== TileType.dropdown) {
            transformComponent.lastValidLayer = layer;
         // If the layer is valid and the entity is on a dropdown, move down
         } else if (layer === transformComponent.lastValidLayer) {
            // @Temporary
            changeEntityLayer(entity, undergroundLayer);
         }
      }

      updateEntityLights(entity);
   }
}

const pushHitbox = (transformComponent: TransformComponent, hitbox: Hitbox, otherHitbox: Hitbox, springForceX: number, springForceY: number): void => {
   if (hitbox.box.parent !== null) {
      // We need to adjust the offset of the hitbox such that the position is moved by (springForceX, springForceY)
      const rotatedSpringForceX = rotateXAroundOrigin(springForceX, springForceY, -hitbox.box.parent.rotation);
      const rotatedSpringForceY = rotateYAroundOrigin(springForceX, springForceY, -hitbox.box.parent.rotation);

      hitbox.box.offset.x += rotatedSpringForceX;
      hitbox.box.offset.y += rotatedSpringForceY;
   } else {
      // Add the raw spring force here because the position is already world-relative
      transformComponent.position.x += springForceX;
      transformComponent.position.y += springForceY;

      // So that it doesn't affect the other hitboxes' position
      const otherParentRotation = otherHitbox.box.parent !== null ? otherHitbox.box.parent.rotation : transformComponent.relativeRotation;
      const rotatedSpringForceX = rotateXAroundOrigin(springForceX, springForceY, -otherParentRotation);
      const rotatedSpringForceY = rotateYAroundOrigin(springForceX, springForceY, -otherParentRotation);
      otherHitbox.box.offset.x -= rotatedSpringForceX;
      otherHitbox.box.offset.y -= rotatedSpringForceY;
   }
}

const applyHitboxTethers = (transformComponent: TransformComponent): void => {
   const tethers = transformComponent.tethers;
   
   // Apply the spring physics
   for (const tether of tethers) {
      const hitbox = tether.hitbox;
      const otherHitbox = tether.otherHitbox;

      const diffX = otherHitbox.box.position.x - hitbox.box.position.x;
      const diffY = otherHitbox.box.position.y - hitbox.box.position.y;
      const distance = Math.sqrt(diffX * diffX + diffY * diffY);

      const normalisedDiffX = diffX / distance;
      const normalisedDiffY = diffY / distance;

      const displacement = distance - tether.idealDistance;
      
      // Calculate spring force
      const springForceX = normalisedDiffX * tether.springConstant * displacement * Settings.I_TPS;
      const springForceY = normalisedDiffY * tether.springConstant * displacement * Settings.I_TPS;
      
      // Apply spring force
      pushHitbox(transformComponent, hitbox, otherHitbox, springForceX, springForceY);
      pushHitbox(transformComponent, otherHitbox, hitbox, -springForceX, -springForceY);
   }

   // Verlet integration
   for (const tether of tethers) {
      const hitbox = tether.hitbox;
      
      const velocityX = (hitbox.box.offset.x - tether.previousOffsetX) * (1 - tether.damping);
      const velocityY = (hitbox.box.offset.y - tether.previousOffsetY) * (1 - tether.damping);
      
      // Update previous position for next frame
      tether.previousOffsetX = hitbox.box.offset.x;
      tether.previousOffsetY = hitbox.box.offset.y;

      hitbox.box.offset.x += velocityX;
      hitbox.box.offset.y += velocityY;
   }

   // @Speed: Is this necessary every tick?
   transformComponent.isDirty = true;
}

export function fixCarriedEntityPosition(transformComponent: TransformComponent, carryInfo: EntityCarryInfo, mountTransformComponent: TransformComponent): void {
   transformComponent.position.x = mountTransformComponent.position.x + rotateXAroundOrigin(carryInfo.offsetX, carryInfo.offsetY, mountTransformComponent.relativeRotation);
   transformComponent.position.y = mountTransformComponent.position.y + rotateYAroundOrigin(carryInfo.offsetX, carryInfo.offsetY, mountTransformComponent.relativeRotation);
   transformComponent.rotation = transformComponent.relativeRotation + mountTransformComponent.rotation;

   // @Speed: what if the position/rotation doesn't change?
   registerDirtyEntity(carryInfo.carriedEntity);
}

const tickCarriedEntity = (mountTransformComponent: TransformComponent, carryInfo: EntityCarryInfo): void => {
   const transformComponent = TransformComponentArray.getComponent(carryInfo.carriedEntity);

   fixCarriedEntityPosition(transformComponent, carryInfo, mountTransformComponent);
      
   transformComponent.selfVelocity.x = 0;
   transformComponent.selfVelocity.y = 0;
   transformComponent.externalVelocity.x = getVelocityX(mountTransformComponent);
   transformComponent.externalVelocity.y = getVelocityY(mountTransformComponent);

   if (PhysicsComponentArray.hasComponent(carryInfo.carriedEntity)) {
      const physicsComponent = PhysicsComponentArray.getComponent(carryInfo.carriedEntity);
      turnEntity(carryInfo.carriedEntity, transformComponent, physicsComponent);
   }
   applyHitboxTethers(transformComponent);
   updatePosition(carryInfo.carriedEntity, transformComponent);
   
   // Propagate to children
   for (const carryInfo of transformComponent.carriedEntities) {
      tickCarriedEntity(transformComponent, carryInfo);
   }
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   // If the entity isn't being carried, update its' physics
   if (transformComponent.carryRoot === entity) {
      turnEntity(entity, transformComponent, physicsComponent);
      applyPhysics(entity, transformComponent, physicsComponent);
      applyHitboxTethers(transformComponent);
      updatePosition(entity, transformComponent);

      // @Hack
      transformComponent.rotation = transformComponent.relativeRotation;

      for (const carryInfo of transformComponent.carriedEntities) {
         tickCarriedEntity(transformComponent, carryInfo);
      }
   }
}

export function applyKnockback(entity: Entity, knockback: number, knockbackDirection: number): void {
   if (!PhysicsComponentArray.hasComponent(entity)) {
      return;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if (physicsComponent.isImmovable) {
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   const knockbackForce = knockback / transformComponent.totalMass;
   transformComponent.externalVelocity.x += knockbackForce * Math.sin(knockbackDirection);
   transformComponent.externalVelocity.y += knockbackForce * Math.cos(knockbackDirection);

   // @Hack?
   if (getEntityType(entity) === EntityType.player) {
      registerPlayerKnockback(entity, knockback, knockbackDirection);
   }
}

export function applyAbsoluteKnockback(entity: Entity, knockback: number, knockbackDirection: number): void {
   if (!PhysicsComponentArray.hasComponent(entity)) {
      return;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if (physicsComponent.isImmovable) {
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   transformComponent.externalVelocity.x += knockback * Math.sin(knockbackDirection);
   transformComponent.externalVelocity.y += knockback * Math.cos(knockbackDirection);

   // @Hack?
   if (getEntityType(entity) === EntityType.player) {
      registerPlayerKnockback(entity, knockback, knockbackDirection);
   }
}

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   packet.addNumber(physicsComponent.acceleration.x);
   packet.addNumber(physicsComponent.acceleration.y);
   packet.addNumber(physicsComponent.traction);
}

// @Cleanup: should be in transform component cuz thats where the velocity property is

export function getVelocityX(transformComponent: TransformComponent): number {
   return transformComponent.selfVelocity.x + transformComponent.externalVelocity.x;
}

export function getVelocityY(transformComponent: TransformComponent): number {
   return transformComponent.selfVelocity.y + transformComponent.externalVelocity.y;
}

export function getVelocityMagnitude(transformComponent: TransformComponent): number {
   const vx = getVelocityX(transformComponent);
   const vy = getVelocityY(transformComponent);
   return Math.sqrt(vx * vx + vy * vy);
}

export function slowVelocity(transformComponent: TransformComponent, slowUnits: number): void {
   const selfVelocityMagnitude = transformComponent.selfVelocity.length();
   const externalVelocityMagnitude = transformComponent.externalVelocity.length();

   if (selfVelocityMagnitude > 0) {
      const ratio = selfVelocityMagnitude / (selfVelocityMagnitude + externalVelocityMagnitude);
      const reduction = Math.min(slowUnits * ratio, selfVelocityMagnitude);
      transformComponent.selfVelocity.x -= reduction * transformComponent.selfVelocity.x / selfVelocityMagnitude;
      transformComponent.selfVelocity.y -= reduction * transformComponent.selfVelocity.y / selfVelocityMagnitude;
   }

   if (externalVelocityMagnitude > 0) {
      const ratio = externalVelocityMagnitude / (externalVelocityMagnitude + selfVelocityMagnitude);
      const reduction = Math.min(slowUnits * ratio, externalVelocityMagnitude);
      transformComponent.externalVelocity.x -= reduction * transformComponent.externalVelocity.x / externalVelocityMagnitude;
      transformComponent.externalVelocity.y -= reduction * transformComponent.externalVelocity.y / externalVelocityMagnitude;
   }
}