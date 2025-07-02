import { ServerComponentType } from "battletribes-shared/components";
import { assert, customTickIntervalHasPassed, lerp, randInt, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { TILE_PHYSICS_INFO_RECORD, TileType } from "battletribes-shared/tiles";
import Board from "../../Board";
import { Entity, EntityType } from "battletribes-shared/entities";
import Particle from "../../Particle";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { playSoundOnHitbox } from "../../sound";
import { keyIsPressed } from "../../keyboard-input";
import { resolveWallCollisions } from "../../collision";
import { PacketReader } from "battletribes-shared/packets";
import { createWaterSplashParticle } from "../../particles";
import { entityExists, EntityParams, getEntityLayer, getEntityRenderInfo, getEntityType } from "../../world";
import { EntityAttachInfo, entityChildIsEntity, entityChildIsHitbox, entityIsInRiver, getHitboxTile, TransformComponent, TransformComponentArray, cleanTransform } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { registerDirtyRenderInfo } from "../../rendering/render-part-matrices";
import { playerInstance } from "../../player";
import { applyAcceleration, getHitboxVelocity, Hitbox, setHitboxVelocityX, setHitboxVelocityY } from "../../hitboxes";
import { updateBox } from "../../../../shared/src/boxes/boxes";

export interface PhysicsComponentParams {
   readonly traction: number;
}

export interface PhysicsComponent {
   traction: number;

   ignoredTileSpeedMultipliers: ReadonlyArray<TileType>;
}

// We use this so that a component tries to override the empty array with the same empty
// array, instead of a different empty array which would cause garbage collection
const EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS = new Array<TileType>();

export function resetIgnoredTileSpeedMultipliers(physicsComponent: PhysicsComponent): void {
   physicsComponent.ignoredTileSpeedMultipliers = EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS;
}

const applyHitboxKinematics = (transformComponent: TransformComponent, entity: Entity, hitbox: Hitbox): void => {
   if (isNaN(hitbox.box.position.x) || isNaN(hitbox.box.position.y)) {
      throw new Error("Position was NaN.");
   }

   const layer = getEntityLayer(entity);
   const tile = getHitboxTile(layer, hitbox);

   if (isNaN(hitbox.box.position.x)) {
      throw new Error("Position was NaN.");
   }

   // @Incomplete: here goes fish suit exception
   // Apply river flow to external velocity
   if (entityIsInRiver(transformComponent, entity)) {
      const flowDirection = layer.getRiverFlowDirection(tile.x, tile.y);
      if (flowDirection > 0) {
         applyAcceleration(entity, hitbox, 240 / Settings.TPS * Math.sin(flowDirection - 1), 240 / Settings.TPS * Math.cos(flowDirection - 1));
      }
   }

   const tilePhysicsInfo = TILE_PHYSICS_INFO_RECORD[tile.type];
   const tileFriction = tilePhysicsInfo.friction;

   let velX = hitbox.box.position.x - hitbox.previousPosition.x;
   let velY = hitbox.box.position.y - hitbox.previousPosition.y;
      
   // Air friction
   // @Bug? the tile's friction shouldn't affect air friction?
   velX *= 1 - tileFriction / Settings.TPS * 2;
   velY *= 1 - tileFriction / Settings.TPS * 2;

   // Ground friction
   const velocityMagnitude = Math.hypot(velX, velY);
   if (velocityMagnitude > 0) {
      const groundFriction = Math.min(tileFriction, velocityMagnitude);
      velX -= groundFriction * velX / velocityMagnitude / Settings.TPS;
      velY -= groundFriction * velY / velocityMagnitude / Settings.TPS;
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

   // Mark entity's position as updated
   cleanTransform(entity);
   const renderInfo = getEntityRenderInfo(entity);
   registerDirtyRenderInfo(renderInfo);
}

const resolveBorderCollisions = (entity: Entity): boolean => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const EPSILON = 0.00001;
   
   let hasMoved = false;
   
   const baseHitbox = transformComponent.children[0] as Hitbox;

   // @Incomplete: do this using transform component bounds
   
   // @Bug: if the entity is a lot of hitboxes stacked vertically, and they are all in the left border, then they will be pushed too far out.
   for (const hitbox of transformComponent.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }
      
      const box = hitbox.box;
      
      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();

      // Left wall
      if (minX < 0) {
         translateHitbox(baseHitbox, -minX + EPSILON, 0);
         setHitboxVelocityX(baseHitbox, 0);
         hasMoved = true;
         // Right wall
      } else if (maxX > Settings.BOARD_UNITS) {
         translateHitbox(baseHitbox, Settings.BOARD_UNITS - maxX - EPSILON, 0);
         setHitboxVelocityX(baseHitbox, 0);
         hasMoved = true;
      }
      
      // Bottom wall
      if (minY < 0) {
         translateHitbox(baseHitbox, 0, -minY + EPSILON);
         setHitboxVelocityY(baseHitbox, 0);
         hasMoved = true;
         // Top wall
      } else if (maxY > Settings.BOARD_UNITS) {
         translateHitbox(baseHitbox, 0, -maxY + Settings.BOARD_UNITS - EPSILON);
         setHitboxVelocityY(baseHitbox, 0);
         hasMoved = true;
      }

      // @Bug @Incomplete Can happen if maxX is something crazy like 1584104521169366000. fix!!!
      if (box.calculateBoundsMinX() < 0 || box.calculateBoundsMaxX() >= Settings.BOARD_UNITS || box.calculateBoundsMinY() < 0 || box.calculateBoundsMaxY() >= Settings.BOARD_UNITS) {
         throw new Error();
      }
   }

   return hasMoved;
}

export const PhysicsComponentArray = new ServerComponentArray<PhysicsComponent, PhysicsComponentParams, never>(ServerComponentType.physics, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   onUpdate: onUpdate,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

function createParamsFromData(reader: PacketReader): PhysicsComponentParams {
   const traction = reader.readNumber();

   return {
      traction: traction
   };
}

function createComponent(entityParams: EntityParams): PhysicsComponent {
   const physicsComponentParams = entityParams.serverComponentParams[ServerComponentType.physics]!;
   
   return {
      traction: physicsComponentParams.traction,
      ignoredTileSpeedMultipliers: EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS
   }
}

function getMaxRenderParts(): number {
   return 0;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   
   // Water droplet particles
   // @Cleanup: Don't hardcode fish condition
   if (entityIsInRiver(transformComponent, entity) && customTickIntervalHasPassed(Board.clientTicks, 0.05) && (getEntityType(entity) !== EntityType.fish)) {
      createWaterSplashParticle(hitbox.box.position.x, hitbox.box.position.y);
   }
   
   // Water splash particles
   // @Cleanup: Move to particles file
   if (entityIsInRiver(transformComponent, entity) && customTickIntervalHasPassed(Board.clientTicks, 0.15) && getHitboxVelocity(hitbox).length() > 0&& getEntityType(entity) !== EntityType.fish) {
      const lifetime = 2.5;

      const particle = new Particle(lifetime);
      particle.getOpacity = (): number => {
         return lerp(0.75, 0, Math.sqrt(particle.age / lifetime));
      }
      particle.getScale = (): number => {
         return 1 + particle.age / lifetime * 1.4;
      }

      addTexturedParticleToBufferContainer(
         particle,
         ParticleRenderLayer.low,
         64, 64,
         hitbox.box.position.x, hitbox.box.position.y,
         0, 0, 
         0, 0,
         0,
         2 * Math.PI * Math.random(),
         0,
         0,
         0,
         8 * 1 + 5,
         0, 0, 0
      );
      Board.lowTexturedParticles.push(particle);

      playSoundOnHitbox("water-splash-" + randInt(1, 3) + ".mp3", 0.25, 1, entity, hitbox, false);
   }
}

const translateHitbox = (hitbox: Hitbox, pushX: number, pushY: number): void => {
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
      updateBox(hitbox.box, hitbox.parent.box);
   }
}

const applyHitboxTethers = (transformComponent: TransformComponent, hitbox: Hitbox): void => {
   // Apply the spring physics
   for (const tether of hitbox.tethers) {
      const originBox = tether.originBox;

      const diffX = originBox.position.x - hitbox.box.position.x;
      const diffY = originBox.position.y - hitbox.box.position.y;
      const distance = Math.sqrt(diffX * diffX + diffY * diffY);
      if (distance === 0) {
         continue;
      }

      const normalisedDiffX = diffX / distance;
      const normalisedDiffY = diffY / distance;

      const displacement = distance - tether.idealDistance;
      
      // Calculate spring force
      const springForceX = normalisedDiffX * tether.springConstant * displacement;
      const springForceY = normalisedDiffY * tether.springConstant * displacement;
      
      hitbox.acceleration.x += springForceX / hitbox.mass;
      hitbox.acceleration.y += springForceY / hitbox.mass;
      // Don't move the other hitbox, as that will be accounted for by the server!
   }
}

const tickCarriedEntity = (mountTransformComponent: TransformComponent, carryInfo: EntityAttachInfo): void => {
   assert(entityExists(carryInfo.attachedEntity));
   
   const transformComponent = TransformComponentArray.getComponent(carryInfo.attachedEntity);

   // @Incomplete
   // turnEntity(carryInfo.carriedEntity, transformComponent, physicsComponent);
   // (Don't apply physics for carried entities)
   // @Incomplete
   // applyHitboxTethers(transformComponent, physicsComponent);
   cleanTransform(carryInfo.attachedEntity);

   // Propagate to children
   for (const entityAttachInfo of transformComponent.children) {
      if (entityChildIsEntity(entityAttachInfo)) {
         tickCarriedEntity(transformComponent, entityAttachInfo);
      }
   }
}

function onUpdate(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent.boundingAreaMinX < 0 || transformComponent.boundingAreaMaxX >= Settings.BOARD_UNITS || transformComponent.boundingAreaMinY < 0 || transformComponent.boundingAreaMaxY >= Settings.BOARD_UNITS) {
      throw new Error();
   }

   for (const child of transformComponent.children) {
      if (!entityChildIsHitbox(child)) {
         continue;
      }

      const hitbox = child;
      applyHitboxTethers(transformComponent, hitbox);
   }
   
   // If the entity isn't being carried, update its' physics
   if (transformComponent.rootEntity === entity) {
      for (const rootChild of transformComponent.rootChildren) {
         if (entityChildIsHitbox(rootChild)) {
            applyHitboxKinematics(transformComponent, entity, rootChild);
         }
      }
      // @Speed: only do if the kinematics moved the entity
      cleanTransform(entity);
      
      // Don't resolve wall tile collisions in lightspeed mode
      if (entity !== playerInstance || !keyIsPressed("l")) { 
         const hasMoved = resolveWallCollisions(entity);
   
         if (hasMoved) {
            cleanTransform(entity);
         }
      }
   
      const hasMoved = resolveBorderCollisions(entity);
      if (hasMoved) {
         cleanTransform(entity);
      }

      // Propagate to children
      // for (const entityAttachInfo of transformComponent.children) {
      //    if (entityChildIsEntity(entityAttachInfo)) {
      //       tickCarriedEntity(transformComponent, entityAttachInfo);
      //    }
      // }
   } else {
      // The player is attached to a parent: need to snap them to the parent!
      for (const child of transformComponent.children) {
         if (entityChildIsEntity(child)) {
            cleanTransform(child.attachedEntity);
         } else {
            cleanTransform(child);
         }
      }
   }

   if (transformComponent.boundingAreaMinX < 0 || transformComponent.boundingAreaMaxX >= Settings.BOARD_UNITS || transformComponent.boundingAreaMinY < 0 || transformComponent.boundingAreaMaxY >= Settings.BOARD_UNITS) {
      throw new Error();
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   physicsComponent.traction = reader.readNumber();
}

function updatePlayerFromData(reader: PacketReader, isInitialData: boolean): void {
   if (isInitialData) {
      updateFromData(reader, playerInstance!);
   } else {
      padData(reader);
   }
}