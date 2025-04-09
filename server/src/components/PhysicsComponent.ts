import { Settings } from "battletribes-shared/settings";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { TileType, TILE_FRICTIONS } from "battletribes-shared/tiles";
import { ComponentArray } from "./ComponentArray";
import { entityCanBlockPathfinding } from "../pathfinding";
import { registerDirtyEntity } from "../server/player-clients";
import { cleanTransform, resolveEntityBorderCollisions, entityChildIsEntity, entityChildIsHitbox, TransformComponent, TransformComponentArray, changeEntityLayer } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { getEntityLayer, getEntityType } from "../world";
import { undergroundLayer } from "../layers";
import { updateEntityLights } from "../light-levels";
import { applyAcceleration, getHitboxTile, getHitboxVelocity, Hitbox, hitboxIsInRiver, translateHitbox } from "../hitboxes";
import { rotateXAroundOrigin, rotateYAroundOrigin } from "../../../shared/src/utils";
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


const tickHitboxAngularPhysics = (entity: Entity, hitbox: Hitbox, transformComponent: TransformComponent): void => {
   if (hitbox.box.relativeAngle === hitbox.previousRelativeAngle && hitbox.angularAcceleration === 0) {
      return;
   }
   
   const newAngle = hitbox.box.relativeAngle + (hitbox.box.relativeAngle - hitbox.previousRelativeAngle) + hitbox.angularAcceleration / Settings.TPS / Settings.TPS;

   hitbox.previousRelativeAngle = hitbox.box.relativeAngle;
   hitbox.box.relativeAngle = newAngle;
   hitbox.angularAcceleration = 0;

   transformComponent.isDirty = true;
   registerDirtyEntity(entity);
}

const applyHitboxKinematics = (entity: Entity, hitbox: Hitbox, transformComponent: TransformComponent, physicsComponent: PhysicsComponent): void => {
   // @Speed: There are a whole bunch of conditions in here which rely on physicsComponent.isAffectedByFriction,
   // which is only set at the creation of an entity. To remove these conditions we could probably split the physics
   // entities into two groups, and call two different applyPhysicsFriction and applyPhysicsNoFriction functions to
   // the corresponding groups

   if (isNaN(hitbox.box.position.x) || isNaN(hitbox.box.position.y)) {
      throw new Error();
   }
   
   const layer = getEntityLayer(entity);
   
   const tileIndex = getHitboxTile(hitbox);
   const tileType = layer.tileTypes[tileIndex];

   // If the game object is in a river, push them in the flow direction of the river
   // The tileMoveSpeedMultiplier check is so that game objects on stepping stones aren't pushed
   if (hitboxIsInRiver(entity, hitbox) && !physicsComponent.overrideMoveSpeedMultiplier && physicsComponent.isAffectedByGroundFriction) {
      const flowDirectionIdx = layer.riverFlowDirections[tileIndex];
      applyAcceleration(hitbox, 240 * Settings.I_TPS * a[flowDirectionIdx], 240 * Settings.I_TPS * b[flowDirectionIdx]);
   }

   // @Cleanup: shouldn't be used by air friction.
   const friction = TILE_FRICTIONS[tileType];
   
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

const applyHitboxAngularTethers = (hitbox: Hitbox): void => {
   for (const angularTether of hitbox.angularTethers) {
      const originHitbox = angularTether.originHitbox;
      
      const idealDirection = originHitbox.box.angle;
      const tetherDirection = originHitbox.box.position.calculateAngleBetween(hitbox.box.position);
      const diff = cleanAngleNEW(tetherDirection - idealDirection);

      if (Math.abs(diff) > angularTether.padding) {
         const rotationForce = (diff - angularTether.padding * Math.sign(diff)) * angularTether.springConstant * Settings.I_TPS;

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
   
      const hitboxVelocity = getHitboxVelocity(hitbox);
      const originHitboxVelocity = getHitboxVelocity(originHitbox);

      const relVelX = hitboxVelocity.x - originHitboxVelocity.x;
      const relVelY = hitboxVelocity.y - originHitboxVelocity.y;

      const dampingForceX = -relVelX * tether.damping;
      const dampingForceY = -relVelY * tether.damping;
      
      // @Incomplete: doesn't account for root hitbox!
      hitbox.acceleration.x += (springForceX + dampingForceX) / hitbox.mass;
      hitbox.acceleration.y += (springForceY + dampingForceY) / hitbox.mass;
      // translateHitbox(hitbox, springForceX, springForceY);
      if (tether.affectsOriginHitbox) {
         originHitbox.acceleration.x -= (springForceX + dampingForceX) / originHitbox.mass;
         originHitbox.acceleration.y -= (springForceY + dampingForceY) / originHitbox.mass;
         // translateHitbox(originHitbox, -springForceX, -springForceY);
      }
   }

   let hasUpdated = false;
   for (const child of transformComponent.children) {
      if (!entityChildIsHitbox(child)) {
         continue;
      }

      const hitbox = child;
      applyHitboxAngularTethers(hitbox);
      if (hitbox.angularTethers.length > 0) {
         hasUpdated = true;
      }
   }

   if (tethers.length > 0 || hasUpdated) {
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