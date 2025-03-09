import { Settings } from "battletribes-shared/settings";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType, EntityTypeString } from "battletribes-shared/entities";
import { TileType, TILE_FRICTIONS } from "battletribes-shared/tiles";
import { ComponentArray } from "./ComponentArray";
import { entityCanBlockPathfinding } from "../pathfinding";
import { registerDirtyEntity } from "../server/player-clients";
import { cleanTransform, getEntityTile, getHitboxTile, resolveEntityBorderCollisions, entityChildIsEntity, entityChildIsHitbox, TransformComponent, TransformComponentArray, changeEntityLayer } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { getEntityLayer, getEntityType } from "../world";
import { undergroundLayer } from "../layers";
import { updateEntityLights } from "../light-levels";
import { Hitbox } from "../hitboxes";
import { rotateXAroundOrigin, rotateYAroundOrigin } from "../../../shared/src/utils";
import { updateBox } from "../../../shared/src/boxes/boxes";

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

const cleanRelativeAngle = (hitbox: Hitbox): void => {
   // Clamp angle to [-PI, PI) range
   if (hitbox.box.relativeAngle < -Math.PI) {
      hitbox.box.relativeAngle += Math.PI * 2;
   } else if (hitbox.box.relativeAngle >= Math.PI) {
      hitbox.box.relativeAngle -= Math.PI * 2;
   }
}

const turnHitbox = (entity: Entity, hitbox: Hitbox, transformComponent: TransformComponent): void => {
   if (hitbox.angleTurnSpeed === 0) {
      return;
   }
   
   if (hitbox.idealAngle === -999) {
      // Take the angleTurnSpeed value as angular velocity
      hitbox.box.relativeAngle += hitbox.angleTurnSpeed * Settings.I_TPS;
      transformComponent.isDirty = true;
      registerDirtyEntity(entity);
   } else {
      cleanRelativeAngle(hitbox);

      const previousAngle = hitbox.box.relativeAngle;
      
      let clockwiseDist = hitbox.idealAngle - hitbox.box.relativeAngle;
      if (clockwiseDist < 0) {
         clockwiseDist += 2 * Math.PI;
      } else if (clockwiseDist >= 2 * Math.PI) {
         clockwiseDist -= 2 * Math.PI;
      }

      if (clockwiseDist <= Math.PI) {  
         hitbox.box.relativeAngle += hitbox.angleTurnSpeed * Settings.I_TPS;
         // If the entity would turn past the target direction, snap back to the target direction
         if (hitbox.angleTurnSpeed * Settings.I_TPS > clockwiseDist) {
            hitbox.box.relativeAngle = hitbox.idealAngle;
         }
      } else {
         const anticlockwiseDist = 2 * Math.PI - clockwiseDist;
         
         hitbox.box.relativeAngle -= hitbox.angleTurnSpeed * Settings.I_TPS
         // If the entity would turn past the target direction, snap back to the target direction
         if (hitbox.angleTurnSpeed * Settings.I_TPS > anticlockwiseDist) {
            hitbox.box.relativeAngle = hitbox.idealAngle;
         }
      }

      // @Incomplete: Floating point inconsistencies might shittify this check.
      if (hitbox.box.relativeAngle !== previousAngle) {
         transformComponent.isDirty = true;
         registerDirtyEntity(entity);
      }
   }
}

const applyHitboxKinematics = (entity: Entity, hitbox: Hitbox, transformComponent: TransformComponent, physicsComponent: PhysicsComponent): void => {
   // @Speed: There are a whole bunch of conditions in here which rely on physicsComponent.isAffectedByFriction,
   // which is only set at the creation of an entity. To remove these conditions we could probably split the physics
   // entities into two groups, and call two different applyPhysicsFriction and applyPhysicsNoFriction functions to
   // the corresponding groups
   
   // @Temporary @Hack
   if (isNaN(hitbox.velocity.x) || isNaN(hitbox.velocity.y)) {
      console.warn("Entity type " + EntityTypeString[getEntityType(entity)] + " velocity was NaN.");
      hitbox.velocity.x = 0;
      hitbox.velocity.y = 0;
   }

   const layer = getEntityLayer(entity);
   
   const tileIndex = getHitboxTile(hitbox);
   const tileType = layer.tileTypes[tileIndex];

   // If the game object is in a river, push them in the flow direction of the river
   // The tileMoveSpeedMultiplier check is so that game objects on stepping stones aren't pushed
   if (transformComponent.isInRiver && !physicsComponent.overrideMoveSpeedMultiplier && physicsComponent.isAffectedByGroundFriction) {
      const flowDirectionIdx = layer.riverFlowDirections[tileIndex];
      hitbox.velocity.x += 240 * Settings.I_TPS * a[flowDirectionIdx];
      hitbox.velocity.y += 240 * Settings.I_TPS * b[flowDirectionIdx];
   }

   let shouldUpdate = false;
   
   // Apply friction to velocity
   if (hitbox.velocity.x !== 0 || hitbox.velocity.y !== 0) {
      const friction = TILE_FRICTIONS[tileType];
      
      if (physicsComponent.isAffectedByAirFriction) {
         // Air friction
         hitbox.velocity.x *= 1 - friction * Settings.I_TPS * 2;
         hitbox.velocity.y *= 1 - friction * Settings.I_TPS * 2;
      }

      if (physicsComponent.isAffectedByGroundFriction) {
         // @Incomplete @Bug: Doesn't take into account the TPS. Would also be fixed by pre-multiplying the array
         // Ground friction
         const velocityMagnitude = hitbox.velocity.length();
         if (velocityMagnitude > 0) {
            const groundFriction = Math.min(friction, velocityMagnitude);
            hitbox.velocity.x -= groundFriction * hitbox.velocity.x / velocityMagnitude;
            hitbox.velocity.y -= groundFriction * hitbox.velocity.y / velocityMagnitude;
         }
      }

      shouldUpdate = true;
   }

   if (shouldUpdate) {
      // Update position based on the sum of self-velocity and external velocity
      hitbox.box.position.x += hitbox.velocity.x * Settings.I_TPS;
      hitbox.box.position.y += hitbox.velocity.y * Settings.I_TPS;

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
      cleanTransform(entity);

      // @Correctness: Is this correct? Or should we dirtify these things wherever the isDirty flag is set?
      dirtifyPathfindingNodes(entity, transformComponent);
      registerDirtyEntity(entity);

      // (Potentially introduces dirt)
      transformComponent.resolveWallCollisions(entity);

      // If the object moved due to resolving wall tile collisions, recalculate
      if (transformComponent.isDirty) {
         cleanTransform(entity);
         // @Cleanup: pointless, if always done above?
         registerDirtyEntity(entity);
      }

      // (Potentially introduces dirt)
      resolveEntityBorderCollisions(transformComponent);
   
      // If the object moved due to resolving border collisions, recalculate
      if (transformComponent.isDirty) {
         cleanTransform(entity);
         // @Cleanup: pointless, if always done above?
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

const pushHitbox = (hitbox: Hitbox, springForceX: number, springForceY: number): void => {
   if (hitbox.parent === null) {
      // Add the raw spring force here because the position is already world-relative
      hitbox.box.position.x += springForceX;
      hitbox.box.position.y += springForceY;
   } else {
      // We need to adjust the offset of the parent such that the position is moved by (springForceX, springForceY)
      const rotatedSpringForceX = rotateXAroundOrigin(springForceX, springForceY, -hitbox.parent.box.angle);
      const rotatedSpringForceY = rotateYAroundOrigin(springForceX, springForceY, -hitbox.parent.box.angle);

      hitbox.box.offset.x += rotatedSpringForceX;
      hitbox.box.offset.y += rotatedSpringForceY;
      updateBox(hitbox.box, hitbox.parent.box.position.x, hitbox.parent.box.position.y, hitbox.parent.box.angle);
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
      pushHitbox(hitbox, springForceX, springForceY);
      pushHitbox(otherHitbox, -springForceX, -springForceY);
   }

   // Verlet integration
   // @Investigate: Do we not... apply velocity in a different way immediately before/after in the applyHitboxKinematics function...?
   // for (const tether of tethers) {
   //    const hitbox = tether.hitbox;
      
   //    const velocityX = (hitbox.box.position.x - tether.previousPositionX) * (1 - tether.damping);
   //    const velocityY = (hitbox.box.position.y - tether.previousPositionY) * (1 - tether.damping);
      
   //    // Update previous position for next frame
   //    tether.previousPositionX = hitbox.box.position.x;
   //    tether.previousPositionY = hitbox.box.position.y;

   //    hitbox.box.position.x += velocityX;
   //    hitbox.box.position.y += velocityY;
   // }

   // @Speed: Is this necessary every tick?
   transformComponent.isDirty = true;
}

const tickEntityPhysics = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   for (const child of transformComponent.children) {
      if (entityChildIsHitbox(child)) {
         turnHitbox(entity, child, transformComponent);
      }
   }
   for (const rootChild of transformComponent.children) {
      if (entityChildIsHitbox(rootChild)) {
         applyHitboxKinematics(entity, rootChild, transformComponent, physicsComponent);
      }
   }
   applyHitboxTethers(transformComponent);
   updatePosition(entity, transformComponent);

   for (const entityAttachInfo of transformComponent.children) {
      if (entityChildIsEntity(entityAttachInfo)) {
         tickEntityPhysics(entityAttachInfo.attachedEntity);
      }
   }

   // @Speed: what if the hitboxes don't change?
   // (just for carried entities)
   registerDirtyEntity(entity);
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent.rootEntity === entity) {
      tickEntityPhysics(entity);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   packet.addNumber(physicsComponent.traction);
}