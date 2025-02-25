import { ServerComponentType } from "battletribes-shared/components";
import { Point, assert, customTickIntervalHasPassed, lerp, randInt, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { TILE_MOVE_SPEED_MULTIPLIERS, TileType, TILE_FRICTIONS } from "battletribes-shared/tiles";
import Board from "../../Board";
import { Entity, EntityType } from "battletribes-shared/entities";
import Particle from "../../Particle";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { playSound, playSoundOnEntity } from "../../sound";
import { keyIsPressed } from "../../keyboard-input";
import { resolveWallCollisions } from "../../collision";
import { PacketReader } from "battletribes-shared/packets";
import { createWaterSplashParticle } from "../../particles";
import { entityExists, getEntityLayer, getEntityRenderInfo, getEntityType } from "../../world";
import { EntityCarryInfo, entityIsInRiver, getEntityTile, TransformComponent, TransformComponentArray, updateEntityPosition } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityConfig } from "../ComponentArray";
import { registerDirtyRenderInfo, registerDirtyRenderPosition } from "../../rendering/render-part-matrices";
import { playerInstance } from "../../player";

export interface PhysicsComponentParams {
   readonly acceleration: Point;
   readonly angularVelocity: number;
   readonly traction: number;
}

export interface PhysicsComponent {
   readonly acceleration: Point;

   angularVelocity: number;

   traction: number;

   ignoredTileSpeedMultipliers: ReadonlyArray<TileType>;
}

// We use this so that a component tries to override the empty array with the same empty
// array, instead of a different empty array which would cause garbage collection
const EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS = new Array<TileType>();

export function resetIgnoredTileSpeedMultipliers(physicsComponent: PhysicsComponent): void {
   physicsComponent.ignoredTileSpeedMultipliers = EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS;
}

const applyPhysics = (transformComponent: TransformComponent, physicsComponent: PhysicsComponent, entity: Entity): void => {
   if (isNaN(transformComponent.selfVelocity.x)) {
      throw new Error("Self velocity was NaN.");
   }
   if (isNaN(transformComponent.externalVelocity.x)) {
      throw new Error("External velocity was NaN.");
   }
   if (!isFinite(transformComponent.externalVelocity.x)) {
      throw new Error("External velocity is infinite.");
   }

   const layer = getEntityLayer(entity);
   const tile = getEntityTile(layer, transformComponent);
   
   if (isNaN(transformComponent.position.x)) {
      throw new Error("Position was NaN.");
   }
   
   // Apply acceleration (to self-velocity)
   if (physicsComponent.acceleration.x !== 0 || physicsComponent.acceleration.y !== 0) {
      let tileMoveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[tile.type];
      if (physicsComponent.ignoredTileSpeedMultipliers.includes(tile.type) || (tile.type === TileType.water && !entityIsInRiver(transformComponent, entity))) {
         tileMoveSpeedMultiplier = 1;
      }

      const friction = TILE_FRICTIONS[tile.type];
      
      // Calculate the desired velocity based on acceleration
      const desiredVelocityX = physicsComponent.acceleration.x * friction * tileMoveSpeedMultiplier;
      const desiredVelocityY = physicsComponent.acceleration.y * friction * tileMoveSpeedMultiplier;

      // Apply velocity with traction (blend towards desired velocity)
      transformComponent.selfVelocity.x += (desiredVelocityX - transformComponent.selfVelocity.x) * physicsComponent.traction * Settings.I_TPS;
      transformComponent.selfVelocity.y += (desiredVelocityY - transformComponent.selfVelocity.y) * physicsComponent.traction * Settings.I_TPS;
   }

   // @Incomplete: here goes fish suit exception
   // Apply river flow to external velocity
   if (entityIsInRiver(transformComponent, entity)) {
      const flowDirection = layer.getRiverFlowDirection(tile.x, tile.y);
      if (flowDirection > 0) {
         transformComponent.selfVelocity.x += 240 / Settings.TPS * Math.sin(flowDirection - 1);
         transformComponent.selfVelocity.y += 240 / Settings.TPS * Math.cos(flowDirection - 1);
      }
   }

   let shouldUpdate = false;
   
   // Apply friction to self-velocity
   if (transformComponent.selfVelocity.x !== 0 || transformComponent.selfVelocity.y !== 0) {
      const friction = TILE_FRICTIONS[tile.type];
      
      // Apply air and ground friction to selfVelocity
      transformComponent.selfVelocity.x *= 1 - friction * Settings.I_TPS * 2;
      transformComponent.selfVelocity.y *= 1 - friction * Settings.I_TPS * 2;

      const selfVelocityMagnitude = transformComponent.selfVelocity.length();
      if (selfVelocityMagnitude > 0) {
         const groundFriction = Math.min(friction, selfVelocityMagnitude);
         transformComponent.selfVelocity.x -= groundFriction * transformComponent.selfVelocity.x / selfVelocityMagnitude;
         transformComponent.selfVelocity.y -= groundFriction * transformComponent.selfVelocity.y / selfVelocityMagnitude;
      }

      shouldUpdate = true;
   }

   // Apply friction to external velocity
   if (transformComponent.externalVelocity.x !== 0 || transformComponent.externalVelocity.y !== 0) {
      const friction = TILE_FRICTIONS[tile.type];
      
      // Apply air and ground friction to externalVelocity
      transformComponent.externalVelocity.x *= 1 - friction * Settings.I_TPS * 2;
      transformComponent.externalVelocity.y *= 1 - friction * Settings.I_TPS * 2;

      const externalVelocityMagnitude = transformComponent.externalVelocity.length();
      if (externalVelocityMagnitude > 0) {
         const groundFriction = Math.min(friction, externalVelocityMagnitude);
         transformComponent.externalVelocity.x -= groundFriction * transformComponent.externalVelocity.x / externalVelocityMagnitude;
         transformComponent.externalVelocity.y -= groundFriction * transformComponent.externalVelocity.y / externalVelocityMagnitude;
      }

      shouldUpdate = true;
   }

   if (shouldUpdate) {
      // Update position based on the sum of self-velocity and external velocity
      transformComponent.position.x += (transformComponent.selfVelocity.x + transformComponent.externalVelocity.x) * Settings.I_TPS;
      transformComponent.position.y += (transformComponent.selfVelocity.y + transformComponent.externalVelocity.y) * Settings.I_TPS;

      // Mark entity's position as updated
      updateEntityPosition(transformComponent, entity);
      const renderInfo = getEntityRenderInfo(entity);
      registerDirtyRenderInfo(renderInfo);
      registerDirtyRenderPosition(renderInfo);
   }

   if (isNaN(transformComponent.position.x)) {
      console.log(transformComponent.selfVelocity.x, transformComponent.externalVelocity.x);
      throw new Error("Position was NaN.");
   }
}

const resolveBorderCollisions = (physicsComponent: PhysicsComponent, entity: Entity): boolean => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   let hasMoved = false;
   
   // @Bug: if the entity is a lot of hitboxes stacked vertically, and they are all in the left border, then they will be pushed too far out.
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;
      
      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();

      // Left wall
      if (minX < 0) {
         transformComponent.position.x -= minX;
         transformComponent.selfVelocity.x = 0;
         hasMoved = true;
         // Right wall
      } else if (maxX > Settings.BOARD_UNITS) {
         transformComponent.position.x -= maxX - Settings.BOARD_UNITS;
         transformComponent.selfVelocity.x = 0;
         hasMoved = true;
      }
      
      // Bottom wall
      if (minY < 0) {
         transformComponent.position.y -= minY;
         transformComponent.selfVelocity.y = 0;
         hasMoved = true;
         // Top wall
      } else if (maxY > Settings.BOARD_UNITS) {
         transformComponent.position.y -= maxY - Settings.BOARD_UNITS;
         transformComponent.selfVelocity.y = 0;
         hasMoved = true;
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
   const accelerationX = reader.readNumber();
   const accelerationY = reader.readNumber();
   const traction = reader.readNumber();

   return {
      acceleration: new Point(accelerationX, accelerationY),
      // @Incomplete
      angularVelocity: 0,
      traction: traction
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.physics, never>): PhysicsComponent {
   const physicsComponentParams = entityConfig.serverComponents[ServerComponentType.physics];
   
   return {
      acceleration: physicsComponentParams.acceleration,
      angularVelocity: physicsComponentParams.angularVelocity,
      traction: physicsComponentParams.traction,
      ignoredTileSpeedMultipliers: EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS
   }
}

function getMaxRenderParts(): number {
   return 0;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   // Water droplet particles
   // @Cleanup: Don't hardcode fish condition
   if (entityIsInRiver(transformComponent, entity) && customTickIntervalHasPassed(Board.clientTicks, 0.05) && (getEntityType(entity) !== EntityType.fish)) {
      createWaterSplashParticle(transformComponent.position.x, transformComponent.position.y);
   }
   
   // Water splash particles
   // @Cleanup: Move to particles file
   if (entityIsInRiver(transformComponent, entity) && customTickIntervalHasPassed(Board.clientTicks, 0.15) && (physicsComponent.acceleration.x !== 0 || physicsComponent.acceleration.y !== 0) && getEntityType(entity) !== EntityType.fish) {
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
         transformComponent.position.x, transformComponent.position.y,
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

      playSoundOnEntity("water-splash-" + randInt(1, 3) + ".mp3", 0.25, 1, entity, false);
   }
}

const fixCarriedEntityPosition = (transformComponent: TransformComponent, carryInfo: EntityCarryInfo, mountTransformComponent: TransformComponent): void => {
   transformComponent.position.x = mountTransformComponent.position.x + rotateXAroundOrigin(carryInfo.offsetX, carryInfo.offsetY, mountTransformComponent.rotation);
   transformComponent.position.y = mountTransformComponent.position.y + rotateYAroundOrigin(carryInfo.offsetX, carryInfo.offsetY, mountTransformComponent.rotation);
   transformComponent.rotation = transformComponent.relativeRotation + mountTransformComponent.rotation;
}

const tickCarriedEntity = (mountTransformComponent: TransformComponent, carryInfo: EntityCarryInfo): void => {
   assert(entityExists(carryInfo.carriedEntity));
   
   const transformComponent = TransformComponentArray.getComponent(carryInfo.carriedEntity);
   
   fixCarriedEntityPosition(transformComponent, carryInfo, mountTransformComponent);
      
   transformComponent.selfVelocity.x = 0;
   transformComponent.selfVelocity.y = 0;
   transformComponent.externalVelocity.x = getVelocityX(mountTransformComponent);
   transformComponent.externalVelocity.y = getVelocityY(mountTransformComponent);

   // @Incomplete
   // turnEntity(carryInfo.carriedEntity, transformComponent, physicsComponent);
   // (Don't apply physics for carried entities)
   // @Incomplete
   // applyHitboxTethers(transformComponent, physicsComponent);
   updateEntityPosition(transformComponent, carryInfo.carriedEntity);

   // Propagate to children
   for (const carryInfo of transformComponent.carriedEntities) {
      tickCarriedEntity(transformComponent, carryInfo);
   }
}

function onUpdate(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   
   // If the entity isn't being carried, update its' physics
   if (transformComponent.carryRoot === entity) {
      applyPhysics(transformComponent, physicsComponent, entity);

      // Don't resolve wall tile collisions in lightspeed mode
      if (entity !== playerInstance || !keyIsPressed("l")) { 
         const hasMoved = resolveWallCollisions(entity);
   
         if (hasMoved) {
            updateEntityPosition(transformComponent, entity);
         }
      }
   
      const hasMoved = resolveBorderCollisions(physicsComponent, entity);
      if (hasMoved) {
         updateEntityPosition(transformComponent, entity);
      }

      // @hack
      transformComponent.rotation = transformComponent.relativeRotation;

      // Propagate to children
      for (const carryInfo of transformComponent.carriedEntities) {
         tickCarriedEntity(transformComponent, carryInfo);
      }
   } else {
      // The player is being carried
      const carryRootTransformComponent = TransformComponentArray.getComponent(transformComponent.carryRoot);
      for (const carryInfo of carryRootTransformComponent.carriedEntities) {
         tickCarriedEntity(carryRootTransformComponent, carryInfo);
      }
   }

   // @Incomplete: some entities are able to be outside the border!
   assert(transformComponent.position.x >= 0 && transformComponent.position.x < Settings.BOARD_UNITS && transformComponent.position.y >= 0 && transformComponent.position.y < Settings.BOARD_UNITS, getEntityType(entity).toString());
}

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   physicsComponent.acceleration.x = reader.readNumber();
   physicsComponent.acceleration.y = reader.readNumber();
   physicsComponent.traction = reader.readNumber();
}

function updatePlayerFromData(reader: PacketReader, isInitialData: boolean): void {
   if (isInitialData) {
      updateFromData(reader, playerInstance!);
   } else {
      padData(reader);
   }
}

// @Cleanup: location

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