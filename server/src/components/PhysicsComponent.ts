import { Settings } from "battletribes-shared/settings";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType, EntityTypeString } from "battletribes-shared/entities";
import { TILE_PHYSICS_INFO_RECORD, TileType } from "battletribes-shared/tiles";
import { ComponentArray } from "./ComponentArray";
import { entityCanBlockPathfinding } from "../pathfinding";
import { registerDirtyEntity } from "../server/player-clients";
import { cleanTransform, resolveEntityBorderCollisions, entityChildIsEntity, entityChildIsHitbox, TransformComponent, TransformComponentArray, changeEntityLayer } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { getEntityLayer, getEntityType } from "../world";
import { undergroundLayer } from "../layers";
import { updateEntityLights } from "../lights";
import { addHitboxAngularAcceleration, applyAcceleration, getHitboxAngularVelocity, getHitboxConnectedMass, getHitboxTile, getHitboxVelocity, getTotalMass, Hitbox, hitboxIsInRiver } from "../hitboxes";
import { angleToPoint, getAngleDiff, Point, polarVec2 } from "../../../shared/src/utils";

// @Cleanup: Variable names (also is shit generally, shouldn't keep)
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

const tickHitboxAngularPhysics = (entity: Entity, hitbox: Hitbox, transformComponent: TransformComponent): void => {
   if (hitbox.box.relativeAngle === hitbox.previousRelativeAngle && hitbox.angularAcceleration === 0) {
      return;
   }

   // We don't use the getAngularVelocity function as that multplies it by the tps (it's the instantaneous angular velocity)
   let angularVelocityTick = getAngleDiff(hitbox.previousRelativeAngle, hitbox.box.relativeAngle);
   // @Hack??
   angularVelocityTick *= 0.98;
   
   const newAngle = hitbox.box.relativeAngle + angularVelocityTick + hitbox.angularAcceleration / Settings.TPS / Settings.TPS;

   hitbox.previousRelativeAngle = hitbox.box.relativeAngle;
   hitbox.box.relativeAngle = newAngle;
   hitbox.angularAcceleration = 0;

   transformComponent.isDirty = true;
   registerDirtyEntity(entity);
}

const applyHitboxKinematics = (entity: Entity, hitbox: Hitbox, transformComponent: TransformComponent, physicsComponent: PhysicsComponent): void => {
   if (isNaN(hitbox.box.position.x) || isNaN(hitbox.box.position.y)) {
      throw new Error();
   }
   
   const layer = getEntityLayer(entity);
   
   const tileIndex = getHitboxTile(hitbox);
   const tileType = layer.getTileType(tileIndex);

   // If the game object is in a river, push them in the flow direction of the river
   // The tileMoveSpeedMultiplier check is so that game objects on stepping stones aren't pushed
   if (hitboxIsInRiver(entity, hitbox) && !physicsComponent.overrideMoveSpeedMultiplier && physicsComponent.isAffectedByGroundFriction) {
      const flowDirectionIdx = layer.riverFlowDirections[tileIndex];
      // @HACK
      applyAcceleration(hitbox, new Point(240 * Settings.I_TPS * a[flowDirectionIdx], 240 * Settings.I_TPS * b[flowDirectionIdx]));
   }

   // @Cleanup: shouldn't be used by air friction.
   const tilePhysicsInfo = TILE_PHYSICS_INFO_RECORD[tileType];
   const friction = tilePhysicsInfo.friction;
   
   let velX = hitbox.box.position.x - hitbox.previousPosition.x;
   let velY = hitbox.box.position.y - hitbox.previousPosition.y;

   // Air friction
   if (physicsComponent.isAffectedByAirFriction) {
      // @IncompletE: shouldn't use tile friction!!
      velX *= 1 - friction / Settings.TPS * 2;
      velY *= 1 - friction / Settings.TPS * 2;
   }

   if (physicsComponent.isAffectedByGroundFriction) {
      // Ground friction
      const velocityMagnitude = Math.hypot(velX, velY);
      if (velocityMagnitude > 0) {
         const groundFriction = Math.min(friction, velocityMagnitude);
         velX -= groundFriction * velX / velocityMagnitude / Settings.TPS;
         velY -= groundFriction * velY / velocityMagnitude / Settings.TPS;
      }
   }
   
   // Verlet integration update:
   // new position = current position + (damped implicit velocity) + acceleration * (dt^2)
   const newX = hitbox.box.position.x + velX + hitbox.acceleration.x / Settings.TPS / Settings.TPS;
   const newY = hitbox.box.position.y + velY + hitbox.acceleration.y / Settings.TPS / Settings.TPS;

   hitbox.previousPosition.x = hitbox.box.position.x;
   hitbox.previousPosition.y = hitbox.box.position.y;

   hitbox.box.position.x = newX;
   hitbox.box.position.y = newY;

   hitbox.acceleration.x = 0;
   hitbox.acceleration.y = 0;

   transformComponent.isDirty = true;
   registerDirtyEntity(entity);
}

const dirtifyPathfindingNodes = (entity: Entity, transformComponent: TransformComponent): void => {
   if (entityCanBlockPathfinding(entity)) {
      transformComponent.pathfindingNodesAreDirty = true;
   }
}

const updatePosition = (entity: Entity, transformComponent: TransformComponent): void => {
   if (!transformComponent.isDirty) {
      return;
   }
   
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

const applyHitboxAngularTethers = (hitbox: Hitbox): void => {
   for (const angularTether of hitbox.angularTethers) {
      const originHitbox = angularTether.originHitbox;

      const originToHitboxDirection = originHitbox.box.position.calculateAngleBetween(hitbox.box.position);
      const idealAngle = originHitbox.box.angle + angularTether.idealAngle;
      
      const directionDiff = getAngleDiff(originToHitboxDirection, idealAngle);
      
      if (Math.abs(directionDiff) > angularTether.padding) {
         const rotationForce = (directionDiff - angularTether.padding * Math.sign(directionDiff)) * angularTether.springConstant;

         const hitboxAccDir = originToHitboxDirection + Math.PI/2;
         const originHitboxAccDir = originToHitboxDirection - Math.PI/2;
         
         // @Bug: I don't think using the angular velocity is right - shouldn't it be the actual velocity of the hitbox? but like projected in the torque direction
         // const hitboxAngularVelocity = getHitboxAngularVelocity(hitbox);
         // const originHitboxAngularVelocity = getHitboxAngularVelocity(originHitbox);

         const hitboxTorque = getHitboxVelocity(hitbox).scalarProj(angleToPoint(hitboxAccDir));
         const originHitboxTorque = getHitboxVelocity(originHitbox).scalarProj(angleToPoint(originHitboxAccDir));
         
         // const relVel = hitboxAngularVelocity - originHitboxAngularVelocity;
         const relVel = hitboxTorque - originHitboxTorque;
         const dampingForce = -relVel * angularTether.damping;
         
         const force = (rotationForce + dampingForce) * 0.1;
         // console.log(rotationForce, dampingForce);

         // @HACK: the * 4
         const hitboxAccMag = force / getTotalMass(hitbox) * 4;
         applyAcceleration(hitbox, polarVec2(hitboxAccMag, hitboxAccDir));

         // @HACK: the * 4
         const originHitboxAccMag = force / getTotalMass(originHitbox) * 4;
         // @Speed: don't need to call 2nd polarVec2 cuz this is in the exact reverse direction
         applyAcceleration(originHitbox, polarVec2(originHitboxAccMag, originHitboxAccDir));
      }

      // Restrict the hitboxes' angle to match its direction
      const angleDiff = getAngleDiff(hitbox.box.angle, originToHitboxDirection + angularTether.idealHitboxAngleOffset);
      // @Hack @Cleanup: hardcoded for cow head
      // const anglePadding = 0.3;
      const anglePadding = 0.05;
      const angleSpringConstant = 15;
      const angleDamping = 0.8;
      if (Math.abs(angleDiff) > anglePadding) {
         const rotationForce = (angleDiff - anglePadding * Math.sign(angleDiff)) * angleSpringConstant;

         const dampingForce = -getHitboxAngularVelocity(hitbox) * angleDamping;

         const force = rotationForce + dampingForce;
         
         addHitboxAngularAcceleration(hitbox, force / getTotalMass(hitbox));
      }
   }
}

const applyHitboxRelativeAngleConstraints = (hitbox: Hitbox): void => {
   for (const constraint of hitbox.relativeAngleConstraints) {
      // Restrict the hitboxes' angle to match its direction
      const angleDiff = getAngleDiff(hitbox.box.relativeAngle, constraint.idealAngle);
      // @Hack @Cleanup: hardcoded
      const anglePadding = 0;
      if (Math.abs(angleDiff) > anglePadding) {
         const rotationForce = (angleDiff - anglePadding * Math.sign(angleDiff)) * constraint.springConstant;

         const dampingForce = -getHitboxAngularVelocity(hitbox) * constraint.damping;

         const force = rotationForce + dampingForce;
         
         addHitboxAngularAcceleration(hitbox, force / getTotalMass(hitbox));
      }
   }
}

const applyHitboxTethers = (hitbox: Hitbox, transformComponent: TransformComponent): void => {
   // @Cleanup: basically a wrapper now
   
   applyHitboxAngularTethers(hitbox);
   applyHitboxRelativeAngleConstraints(hitbox);

   if (hitbox.angularTethers.length > 0 || hitbox.relativeAngleConstraints.length > 0) {
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
         tickHitboxAngularPhysics(entity, child, transformComponent);
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

   for (const child of transformComponent.children) {
      if (!entityChildIsHitbox(child)) {
         continue;
      }

      const hitbox = child;
      applyHitboxTethers(hitbox, transformComponent);
   }

   updatePosition(entity, transformComponent);

   for (const entityAttachInfo of transformComponent.children) {
      if (entityChildIsEntity(entityAttachInfo)) {
         const t = TransformComponentArray.getComponent(entityAttachInfo.attachedEntity);
         if (typeof t === "undefined") {
            console.log(EntityTypeString[getEntityType(entity)]);
         }
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