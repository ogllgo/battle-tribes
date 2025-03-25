import { Settings } from "battletribes-shared/settings";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType, EntityTypeString } from "battletribes-shared/entities";
import { TileType, TILE_FRICTIONS } from "battletribes-shared/tiles";
import { ComponentArray } from "./ComponentArray";
import { entityCanBlockPathfinding } from "../pathfinding";
import { registerDirtyEntity } from "../server/player-clients";
import { cleanTransform, resolveEntityBorderCollisions, entityChildIsEntity, entityChildIsHitbox, TransformComponent, TransformComponentArray, changeEntityLayer } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { getEntityLayer, getEntityType } from "../world";
import { undergroundLayer } from "../layers";
import { updateEntityLights } from "../light-levels";
import { getHitboxTile, Hitbox, hitboxIsInRiver } from "../hitboxes";
import { getAbsAngleDiff, rotateXAroundOrigin, rotateYAroundOrigin } from "../../../shared/src/utils";
import { updateBox } from "../../../shared/src/boxes/boxes";
import { cleanAngleNEW } from "../ai-shared";

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
      cleanAngle(hitbox);
      cleanRelativeAngle(hitbox);

      const previousRelativeAngle = hitbox.box.relativeAngle;
      
      let clockwiseDist = hitbox.idealAngle - hitbox.box.angle;
      if (clockwiseDist < 0) {
         clockwiseDist += 2 * Math.PI;
      } else if (clockwiseDist >= 2 * Math.PI) {
         clockwiseDist -= 2 * Math.PI;
      }

      if (clockwiseDist <= Math.PI) {  
         // (Must record it before the relative angle is increased)
         const parentAngle = (hitbox.box.angle - hitbox.box.relativeAngle);
         
         hitbox.box.relativeAngle += hitbox.angleTurnSpeed * Settings.I_TPS;
         // If the entity would turn past the target direction, snap back to the target direction
         if (hitbox.angleTurnSpeed * Settings.I_TPS > clockwiseDist) {
            hitbox.box.relativeAngle = hitbox.idealAngle - parentAngle;
         }
      } else {
         const anticlockwiseDist = 2 * Math.PI - clockwiseDist;
         // (Must record it before the relative angle is decreased)
         const parentAngle = (hitbox.box.angle - hitbox.box.relativeAngle);
         
         hitbox.box.relativeAngle -= hitbox.angleTurnSpeed * Settings.I_TPS
         // If the entity would turn past the target direction, snap back to the target direction
         if (hitbox.angleTurnSpeed * Settings.I_TPS > anticlockwiseDist) {
            hitbox.box.relativeAngle = hitbox.idealAngle - parentAngle;
         }
      }

      // @Incomplete: Floating point inconsistencies might shittify this check.
      if (hitbox.box.relativeAngle !== previousRelativeAngle) {
         transformComponent.isDirty = true;
         registerDirtyEntity(entity);
      }

      if (getAbsAngleDiff(previousRelativeAngle, hitbox.box.relativeAngle) > hitbox.angleTurnSpeed + 0.001) {
         throw new Error("Hitbox turned more than it should have!");
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
   if (hitboxIsInRiver(entity, hitbox) && !physicsComponent.overrideMoveSpeedMultiplier && physicsComponent.isAffectedByGroundFriction) {
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

      // Check to see if the entity has descended into the underground layer
      const entityType = getEntityType(entity);
      if (entityType !== EntityType.guardian && entityType !== EntityType.guardianSpikyBall) {
         // @Hack: fo da glurb container entity
         if (entityChildIsHitbox(transformComponent.children[0])) {
            // Update the last valid layer
            const layer = getEntityLayer(entity);
            // @Hack
            const hitbox = transformComponent.children[0] as Hitbox;
            const tileIndex = getHitboxTile(hitbox);
            if (layer.getTileType(tileIndex) !== TileType.dropdown) {
               transformComponent.lastValidLayer = layer;
            // If the layer is valid and the entity is on a dropdown, move down
            } else if (layer === transformComponent.lastValidLayer) {
               // @Temporary
               changeEntityLayer(entity, undergroundLayer);
            }
         }
      }

      updateEntityLights(entity);
   }
}

export function translateHitbox(hitbox: Hitbox, pushX: number, pushY: number): void {
   if (hitbox.parent === null) {
      // Add the raw translation here because the position is already world-relative
      hitbox.box.position.x += pushX;
      hitbox.box.position.y += pushY;
   } else {
      // We need to adjust the offset of the parent such that the position is moved by (springForceX, springForceY)
      const rotatedSpringForceX = rotateXAroundOrigin(pushX, pushY, -hitbox.parent.box.angle);
      const rotatedSpringForceY = rotateYAroundOrigin(pushX, pushY, -hitbox.parent.box.angle);

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
      const originHitbox = tether.originHitbox;

      const diffX = originHitbox.box.position.x - hitbox.box.position.x;
      const diffY = originHitbox.box.position.y - hitbox.box.position.y;
      const distance = Math.sqrt(diffX * diffX + diffY * diffY);
      if (distance === 0) {
         continue;
      }

      const normalisedDiffX = diffX / distance;
      const normalisedDiffY = diffY / distance;

      const displacement = distance - tether.idealDistance;
      
      // Calculate spring force
      const springForceX = normalisedDiffX * tether.springConstant * displacement * Settings.I_TPS;
      const springForceY = normalisedDiffY * tether.springConstant * displacement * Settings.I_TPS;
      
      // Apply spring force 
      translateHitbox(hitbox, springForceX, springForceY);
      if (tether.affectsOriginHitbox) {
         translateHitbox(originHitbox, -springForceX, -springForceY);
      }

      // Angular tether
      if (typeof tether.angularTether !== "undefined") {
         const idealDirection = originHitbox.box.angle;
         const tetherDirection = originHitbox.box.position.calculateAngleBetween(hitbox.box.position);
         const diff = cleanAngleNEW(tetherDirection - idealDirection);

         if (Math.abs(diff) > tether.angularTether.padding) {
            const rotationForce = (diff - tether.angularTether.padding * Math.sign(diff)) * tether.angularTether.springConstant * Settings.I_TPS;
   
            originHitbox.box.relativeAngle += rotationForce;
            
            // hitbox.box.relativeAngle -= rotationForce;
   
            // We want to rotate the hitbox by -rotationForce relative to the originHitbox. But if the origin hitbox is the hitbox' parent, then we need to subtract it twice to counteract it.
            // const rotationalOffsetForce = -rotationForce * (hitbox.parent === originHitbox ? 2 : 1);
            const rotationalOffsetForce = -rotationForce;
            
            const currentOffsetX = hitbox.box.position.x - originHitbox.box.position.x;
            const currentOffsetY = hitbox.box.position.y - originHitbox.box.position.y;
            const newOffsetX = rotateXAroundOrigin(currentOffsetX, currentOffsetY, rotationalOffsetForce);
            const newOffsetY = rotateYAroundOrigin(currentOffsetX, currentOffsetY, rotationalOffsetForce);
            const moveX = newOffsetX - currentOffsetX;
            const moveY = newOffsetY - currentOffsetY;
            translateHitbox(hitbox, moveX, moveY);
         }
      }
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

   if (tethers.length > 0) {
      // @Speed: Is this necessary every tick?
      transformComponent.isDirty = true;
   }
}

// @Hack: this function used to be called from the physicscomponent, but I realised that all entities need to tick this regardless, so it's now called from the transformcomponent's onTick function. but it's still here, i guess.
export function tickEntityPhysics(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   for (const child of transformComponent.children) {
      if (entityChildIsHitbox(child)) {
         turnHitbox(entity, child, transformComponent);
      }
   }
   // @Hack: this physics component check is needed because the applyHitboxKinematics function needs a physics component... for now, perhaps....
   if (PhysicsComponentArray.hasComponent(entity)) {
      for (const rootChild of transformComponent.rootChildren) {
         if (entityChildIsHitbox(rootChild)) {
            applyHitboxKinematics(entity, rootChild, transformComponent, physicsComponent);
         }
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

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   packet.addNumber(physicsComponent.traction);
}