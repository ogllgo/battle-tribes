import { assert, customTickIntervalHasPassed, distance, lerp, Point, randAngle, randInt, randSign, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { Tile } from "../../Tile";
import { Settings } from "battletribes-shared/settings";
import { TILE_PHYSICS_INFO_RECORD, TileType } from "battletribes-shared/tiles";
import { RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import Chunk from "../../Chunk";
import { randFloat } from "battletribes-shared/utils";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { boxIsCircular, updateBox, Box } from "battletribes-shared/boxes/boxes";
import Layer, { getTileIndexIncludingEdges } from "../../Layer";
import { entityExists, EntityParams, getCurrentLayer, getEntityLayer, getEntityRenderInfo, getEntityType, surfaceLayer } from "../../world";
import Board from "../../Board";
import { Entity, EntityType } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../../shared/src/collision";
import { registerDirtyRenderInfo } from "../../rendering/render-part-matrices";
import { playerInstance } from "../../player";
import { applyAcceleration, getHitboxVelocity, getRootHitbox, Hitbox, HitboxTether, setHitboxVelocity, setHitboxVelocityX, setHitboxVelocityY, translateHitbox } from "../../hitboxes";
import { padHitboxDataExceptLocalID, readBoxFromData, readHitboxFromData, updateHitboxExceptLocalIDFromData, updatePlayerHitboxFromData } from "../../networking/packet-hitboxes";
import Particle from "../../Particle";
import { createWaterSplashParticle } from "../../particles";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { playSoundOnHitbox } from "../../sound";
import { resolveWallCollisions } from "../../collision";
import { keyIsPressed } from "../../keyboard-input";

export interface TransformComponentParams {
   readonly hitboxes: Array<Hitbox>;
   readonly collisionBit: CollisionBit;
   readonly collisionMask: number;
   readonly traction: number;
}

export interface TransformComponent {
   totalMass: number;
   
   readonly chunks: Set<Chunk>;

   hitboxes: Array<Hitbox>;
   readonly hitboxMap: Map<number, Hitbox>;

   readonly rootHitboxes: Array<Hitbox>;

   collisionBit: number;
   collisionMask: number;

   boundingAreaMinX: number;
   boundingAreaMaxX: number;
   boundingAreaMinY: number;
   boundingAreaMaxY: number;

   traction: number;

   ignoredTileSpeedMultipliers: ReadonlyArray<TileType>;
}

// We use this so that a component tries to override the empty array with the same empty
// array, instead of a different empty array which would cause garbage collection
const EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS = new Array<TileType>();

const fillTransformComponentParams = (hitboxes: Array<Hitbox>, collisionBit: CollisionBit, collisionMask: number, traction: number): TransformComponentParams => {
   return {
      hitboxes: hitboxes,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      traction: traction
   };
}

export function createTransformComponentParams(hitboxes: Array<Hitbox>): TransformComponentParams {
   return {
      hitboxes: hitboxes,
      collisionBit: CollisionBit.default,
      collisionMask: DEFAULT_COLLISION_MASK,
      traction: 1
   };
}

function createParamsFromData(reader: PacketReader): TransformComponentParams {
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();

   const hitboxes = new Array<Hitbox>();
   
   const numChildren = reader.readNumber();
   for (let i = 0; i < numChildren; i++) {
      const localID = reader.readNumber();
      const hitbox = readHitboxFromData(reader, localID, hitboxes);
      hitboxes.push(hitbox);
   }

   const traction = reader.readNumber();

   return fillTransformComponentParams(hitboxes, collisionBit, collisionMask, traction);
}

export function resetIgnoredTileSpeedMultipliers(transformComponent: TransformComponent): void {
   transformComponent.ignoredTileSpeedMultipliers = EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS;
}

// @Location
export function getHitboxTile(layer: Layer, hitbox: Hitbox): Tile {
   const tileX = Math.floor(hitbox.box.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(hitbox.box.position.y / Settings.TILE_SIZE);
   
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   return layer.getTile(tileIndex);
}

export function getHitboxByLocalID(hitboxes: ReadonlyArray<Hitbox>, localID: number): Hitbox | null {
   for (const hitbox of hitboxes) {
      if (hitbox.localID === localID) {
         return hitbox;
      }
   }
   return null;
}

const addHitbox = (transformComponent: TransformComponent, hitbox: Hitbox): void => {
   transformComponent.hitboxes.push(hitbox);
   transformComponent.hitboxMap.set(hitbox.localID, hitbox);

   if (hitbox.parent === null) {
      transformComponent.rootHitboxes.push(hitbox);
   } else {
      // @CLEANUP: completely unnecessary??
      const parent = hitbox.parent;
      updateBox(hitbox.box, parent.box);
   }
}
   
export function removeHitboxFromEntity(transformComponent: TransformComponent, hitbox: Hitbox, idx: number): void {
   transformComponent.hitboxes.splice(idx, 1);
   transformComponent.hitboxMap.delete(hitbox.localID);

   if (hitbox.parent === null) {
      const idx = transformComponent.rootHitboxes.indexOf(hitbox);
      assert(idx !== -1);
      transformComponent.rootHitboxes.splice(idx, 1);
   }
}

export function entityIsInRiver(transformComponent: TransformComponent, entity: Entity): boolean {
   const layer = getEntityLayer(entity);

   // @Hack
   const hitbox = transformComponent.hitboxes[0];
   
   const tile = getHitboxTile(layer, hitbox);
   if (tile.type !== TileType.water) {
      return false;
   }

   
   // If the game object is standing on a stepping stone they aren't in a river
   for (const chunk of transformComponent.chunks) {
      for (const steppingStone of chunk.riverSteppingStones) {
         const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
         
         const dist = distance(hitbox.box.position.x, hitbox.box.position.y, steppingStone.positionX, steppingStone.positionY);
         if (dist <= size/2) {
            return false;
         }
      }
   }

   return true;
}

/** Recalculates which chunks the game object is contained in */
const updateContainingChunks = (transformComponent: TransformComponent, entity: Entity): void => {
   const layer = getEntityLayer(entity);
   const containingChunks = new Set<Chunk>();
   
   // Find containing chunks
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;

      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();

      const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            containingChunks.add(chunk);
         }
      }
   }

   // Find all chunks which aren't present in the new chunks and remove them
   for (const chunk of transformComponent.chunks) {
      if (!containingChunks.has(chunk)) {
         chunk.removeEntity(entity);
         transformComponent.chunks.delete(chunk);
      }
   }

   // Add all new chunks
   for (const chunk of containingChunks) {
      if (!transformComponent.chunks.has(chunk)) {
         chunk.addEntity(entity);
         transformComponent.chunks.add(chunk);
      }
   }
}

const cleanHitboxIncludingChildrenTransform = (hitbox: Hitbox): void => {
   if (hitbox.parent === null) {
      hitbox.box.angle = hitbox.box.relativeAngle;
   } else {
      updateBox(hitbox.box, hitbox.parent.box);
      // @Cleanup: maybe should be done in the updatebox function?? if it become updateHitbox??
      const parentVelocity = getHitboxVelocity(hitbox.parent);
      // @Speed: updating the box already sets its position, so we only need to set its previousPosition.
      setHitboxVelocity(hitbox, parentVelocity.x, parentVelocity.y);
   }

   for (const childHitbox of hitbox.children) {
      cleanHitboxIncludingChildrenTransform(childHitbox);
   }
}

export function cleanEntityTransform(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   for (const rootHitbox of transformComponent.rootHitboxes) {
      cleanHitboxIncludingChildrenTransform(rootHitbox);
   }

   transformComponent.boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   transformComponent.boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   transformComponent.boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   transformComponent.boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;

      const boundsMinX = box.calculateBoundsMinX();
      const boundsMaxX = box.calculateBoundsMaxX();
      const boundsMinY = box.calculateBoundsMinY();
      const boundsMaxY = box.calculateBoundsMaxY();

      // Update bounding area
      if (boundsMinX < transformComponent.boundingAreaMinX) {
         transformComponent.boundingAreaMinX = boundsMinX;
      }
      if (boundsMaxX > transformComponent.boundingAreaMaxX) {
         transformComponent.boundingAreaMaxX = boundsMaxX;
      }
      if (boundsMinY < transformComponent.boundingAreaMinY) {
         transformComponent.boundingAreaMinY = boundsMinY;
      }
      if (boundsMaxY > transformComponent.boundingAreaMaxY) {
         transformComponent.boundingAreaMaxY = boundsMaxY;
      }
   }

   updateContainingChunks(transformComponent, entity);
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
         applyAcceleration(entity, hitbox, 240 * Settings.DELTA_TIME * Math.sin(flowDirection - 1), 240 * Settings.DELTA_TIME * Math.cos(flowDirection - 1));
      }
   }

   const tilePhysicsInfo = TILE_PHYSICS_INFO_RECORD[tile.type];
   const tileFriction = tilePhysicsInfo.friction;

   let velX = hitbox.box.position.x - hitbox.previousPosition.x;
   let velY = hitbox.box.position.y - hitbox.previousPosition.y;
      
   // Air friction
   // @Bug? the tile's friction shouldn't affect air friction?
   velX *= 1 - tileFriction * Settings.DELTA_TIME * 2;
   velY *= 1 - tileFriction * Settings.DELTA_TIME * 2;

   // Ground friction
   const velocityMagnitude = Math.hypot(velX, velY);
   if (velocityMagnitude > 0) {
      const groundFriction = Math.min(tileFriction, velocityMagnitude);
      velX -= groundFriction * velX / velocityMagnitude * Settings.DELTA_TIME;
      velY -= groundFriction * velY / velocityMagnitude * Settings.DELTA_TIME;
   }
   
   // Verlet integration update:
   // new position = current position + (damped implicit velocity) + acceleration * (dt^2)
   const newX = hitbox.box.position.x + velX + hitbox.acceleration.x * Settings.DELTA_TIME * Settings.DELTA_TIME;
   const newY = hitbox.box.position.y + velY + hitbox.acceleration.y * Settings.DELTA_TIME * Settings.DELTA_TIME;

   hitbox.previousPosition.x = hitbox.box.position.x;
   hitbox.previousPosition.y = hitbox.box.position.y;

   hitbox.box.position.x = newX;
   hitbox.box.position.y = newY;

   hitbox.acceleration.x = 0;
   hitbox.acceleration.y = 0;

   // Mark entity's position as updated
   cleanEntityTransform(entity);
   const renderInfo = getEntityRenderInfo(entity);
   registerDirtyRenderInfo(renderInfo);
}

const collideWithVerticalWorldBorder = (hitbox: Hitbox, tx: number): void => {
   const rootHitbox = getRootHitbox(hitbox);
   translateHitbox(rootHitbox, tx, 0);
   setHitboxVelocityX(rootHitbox, 0);
}

const collideWithHorizontalWorldBorder = (hitbox: Hitbox, ty: number): void => {
   const rootHitbox = getRootHitbox(hitbox);
   translateHitbox(rootHitbox, 0, ty);
   setHitboxVelocityY(rootHitbox, 0);
}

const resolveAndCleanBorderCollisions = (entity: Entity, transformComponent: TransformComponent): void => {
   const EPSILON = 0.0001;
   
   let hasCorrected = false;
   for (const hitbox of transformComponent.hitboxes) {
      
      // Left border
      const minX = hitbox.box.calculateBoundsMinX();
      if (minX < 0) {
         collideWithVerticalWorldBorder(hitbox, -minX + EPSILON);
         hasCorrected = true;
      }

      // Right border
      const maxX = hitbox.box.calculateBoundsMaxX();
      if (maxX > Settings.BOARD_UNITS) {
         collideWithVerticalWorldBorder(hitbox, Settings.BOARD_UNITS - maxX - EPSILON);
         hasCorrected = true;
      }

      // Bottom border
      const minY = hitbox.box.calculateBoundsMinY();
      if (minY < 0) {
         hasCorrected = true;
         collideWithHorizontalWorldBorder(hitbox, -minY + EPSILON);
      }

      // Top border
      const maxY = hitbox.box.calculateBoundsMaxY();
      if (maxY > Settings.BOARD_UNITS) {
         hasCorrected = true;
         collideWithHorizontalWorldBorder(hitbox, Settings.BOARD_UNITS - maxY - EPSILON);
      }

      // We then need to clean the hitbox so that its children have its position updated to reflect the move
      if (hasCorrected) {
         // we gotta clean the whole transform now, not just the hitbox tree, so that the big bounds are correct
         cleanEntityTransform(entity);
      }
   }

   // If the entity is outside the world border after resolving border collisions, throw an error
   // @Robustness this should be impossible to trigger, so i can remove it and sleep peacefully
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.box.calculateBoundsMinX() < 0 || hitbox.box.calculateBoundsMaxX() >= Settings.BOARD_UNITS || hitbox.box.calculateBoundsMinY() < 0 || hitbox.box.calculateBoundsMaxY() >= Settings.BOARD_UNITS) {
         throw new Error();
      }
   }
}

// @INCOMPLETE
// const applyHitboxTethers = (hitbox: Hitbox, onlyAffectSelf: boolean): void => {
const applyHitboxTethers = (hitbox: Hitbox): void => {
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
      // For ticking the player, we only want to affect the player's own tethers.
      // if (!onlyAffectSelf) {
         // @INCOMPLETE this no worky
         // originBox.acc
      // }
   }

}
const tickHitboxPhysics = (hitbox: Hitbox): void => {
   // @CLEANUP
   const transformComponent = TransformComponentArray.getComponent(hitbox.entity);

   // tickHitboxAngularPhysics(hitbox.entity, hitbox, transformComponent);

   if (hitbox.parent === null) {
      applyHitboxKinematics(transformComponent, hitbox.entity, hitbox);
   }
   
   // @Incomplete
   // applyHitboxTethers(hitbox, transformComponent);

   for (const childHitbox of hitbox.children) {
      tickHitboxPhysics(childHitbox);
   }
}

export const TransformComponentArray = new ServerComponentArray<TransformComponent, TransformComponentParams, never>(ServerComponentType.transform, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onLoad: onLoad,
   onTick: onTick,
   onUpdate: onUpdate,
   onRemove: onRemove,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

function createComponent(entityParams: EntityParams): TransformComponent {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   
   // @INCOMPLETE
   let totalMass = 0;
   const rootHitboxes = new Array<Hitbox>();
   const hitboxMap = new Map<number, Hitbox>();
   for (const hitbox of transformComponentParams.hitboxes) {
      totalMass += hitbox.mass;
      hitboxMap.set(hitbox.localID, hitbox);
      if (hitbox.parent === null) {
         rootHitboxes.push(hitbox);
      }
   }

   return {
      totalMass: totalMass,
      chunks: new Set(),
      hitboxes: transformComponentParams.hitboxes,
      hitboxMap: hitboxMap,
      rootHitboxes: rootHitboxes,
      collisionBit: transformComponentParams.collisionBit,
      collisionMask: transformComponentParams.collisionMask,
      boundingAreaMinX: Number.MAX_SAFE_INTEGER,
      boundingAreaMaxX: Number.MIN_SAFE_INTEGER,
      boundingAreaMinY: Number.MAX_SAFE_INTEGER,
      boundingAreaMaxY: Number.MIN_SAFE_INTEGER,
      traction: transformComponentParams.traction,
      ignoredTileSpeedMultipliers: EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS.slice()
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function onLoad(entity: Entity): void {
   cleanEntityTransform(entity);
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   // Water droplet particles
   // @Cleanup: Don't hardcode fish condition
   if (entityIsInRiver(transformComponent, entity) && customTickIntervalHasPassed(Board.clientTicks, 0.05) && (getEntityType(entity) !== EntityType.fish)) {
      createWaterSplashParticle(hitbox.box.position.x, hitbox.box.position.y);
   }
   
   // Water splash particles
   // @Cleanup: Move to particles file
   if (entityIsInRiver(transformComponent, entity) && customTickIntervalHasPassed(Board.clientTicks, 0.15) && getHitboxVelocity(hitbox).magnitude() > 0&& getEntityType(entity) !== EntityType.fish) {
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
         randAngle(),
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

function onUpdate(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent.boundingAreaMinX < 0 || transformComponent.boundingAreaMaxX >= Settings.BOARD_UNITS || transformComponent.boundingAreaMinY < 0 || transformComponent.boundingAreaMaxY >= Settings.BOARD_UNITS) {
      // @BUG @HACK: This warning should not be a thing. This can occur if I mistakenly set the player spawn position to be outside of the world, then this runs on the player.
      
      console.warn("wat")
      return;
   }

   for (const child of transformComponent.hitboxes) {
      const hitbox = child;
      applyHitboxTethers(hitbox);
   }
   
   for (const rootHitbox of transformComponent.rootHitboxes) {
      tickHitboxPhysics(rootHitbox);
   }

   // @Speed: only do if the kinematics moved the entity
   cleanEntityTransform(entity);
   
   // Don't resolve wall tile collisions in lightspeed mode
   if (!(entity === playerInstance && keyIsPressed("l"))) { 
      const hasMoved = resolveWallCollisions(entity);

      if (hasMoved) {
         cleanEntityTransform(entity);
      }
   }

   resolveAndCleanBorderCollisions(entity, transformComponent);

   if (transformComponent.boundingAreaMinX < 0 || transformComponent.boundingAreaMaxX >= Settings.BOARD_UNITS || transformComponent.boundingAreaMinY < 0 || transformComponent.boundingAreaMaxY >= Settings.BOARD_UNITS) {
      throw new Error();
   }
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (const chunk of transformComponent.chunks) {
      chunk.removeEntity(entity);
   }
}

// @Cleanup: pointless... never gets called, ever
function padData(reader: PacketReader): void {
   // @Bug: I think this is off.... Length of entity data is wrong then?
   reader.padOffset(5 * Float32Array.BYTES_PER_ELEMENT);

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      padHitboxDataExceptLocalID(reader);

      const isTethered = reader.readBoolean();
      reader.padOffset(3);
      if (isTethered) {
         padHitboxDataExceptLocalID(reader);
         reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
      }
   }

   // @Cleanup @Investigate wtf is this... this isn't added in the server...
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   const numCarriedEntities = reader.readNumber();
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT * numCarriedEntities);

   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}
   
function updateFromData(reader: PacketReader, entity: Entity): void {
   // @SPEED: What we could do is explicitly send which hitboxes have been created, and removed, from the server. (When using carmack networking)
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // @HACK @SPEED? (actually this might be ok just if we do the optimisation which only sends components which were updated, not all of em at once)
   const renderInfo = getEntityRenderInfo(entity);
   registerDirtyRenderInfo(renderInfo);
   
   transformComponent.collisionBit = reader.readNumber();
   transformComponent.collisionMask = reader.readNumber();

   // @Speed: would be faster if we split the hitboxes array
   let existingNumCircular = 0;
   let existingNumRectangular = 0;
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (boxIsCircular(hitbox.box)) {
         existingNumCircular++;
      } else {
         existingNumRectangular++;
      }
   }

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const localID = reader.readNumber();

      const hitbox = transformComponent.hitboxMap.get(localID);
      if (typeof hitbox === "undefined") {
         const hitbox = readHitboxFromData(reader, localID, transformComponent.hitboxes);
         addHitbox(transformComponent, hitbox);
      } else {
         updateHitboxExceptLocalIDFromData(hitbox, reader);
      }
   }

   transformComponent.traction = reader.readNumber();

   // Remove hitboxes which no longer exist
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitbox.lastUpdateTicks !== Board.serverTicks) {
         // Hitbox is removed!
         removeHitboxFromEntity(transformComponent, hitbox, i);
         i--;
      }
   }

   // @Speed
   transformComponent.totalMass = 0;
   for (const hitbox of transformComponent.hitboxes) {
      transformComponent.totalMass += hitbox.mass;
   }

   // Update containing chunks and bounds
   // @Copynpaste

   // @Speed
   // @Speed
   // @Speed

   transformComponent.boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   transformComponent.boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   transformComponent.boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   transformComponent.boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   const containingChunks = new Set<Chunk>();

   const layer = getEntityLayer(entity);
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;

      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();

      // Update bounding area
      if (minX < transformComponent.boundingAreaMinX) {
         transformComponent.boundingAreaMinX = minX;
      }
      if (maxX > transformComponent.boundingAreaMaxX) {
         transformComponent.boundingAreaMaxX = maxX;
      }
      if (minY < transformComponent.boundingAreaMinY) {
         transformComponent.boundingAreaMinY = minY;
      }
      if (maxY > transformComponent.boundingAreaMaxY) {
         transformComponent.boundingAreaMaxY = maxY;
      }

      // Recalculate the game object's containing chunks based on the new hitbox bounds
      const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            containingChunks.add(chunk);
         }
      }
   }

   // Find all chunks which aren't present in the new chunks and remove them
   for (const chunk of transformComponent.chunks) {
      if (!containingChunks.has(chunk)) {
         chunk.removeEntity(entity);
         transformComponent.chunks.delete(chunk);
      }
   }

   // Add all new chunks
   for (const chunk of containingChunks) {
      if (!transformComponent.chunks.has(chunk)) {
         chunk.addEntity(entity);
         transformComponent.chunks.add(chunk);
      }
   }
}

function updatePlayerFromData(reader: PacketReader, isInitialData: boolean): void {
   if (isInitialData) {
      updateFromData(reader, playerInstance!);
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

   const numChildren = reader.readNumber();
   for (let i = 0; i < numChildren; i++) {
      const localID = reader.readNumber();
      const hitbox = transformComponent.hitboxMap.get(localID);
      assert(typeof hitbox !== "undefined");

      updatePlayerHitboxFromData(hitbox, reader);
   }

   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

export function getRandomPositionInBox(box: Box): Point {
   if (boxIsCircular(box)) {
      const offsetMagnitude = box.radius * Math.random();
      const offsetDirection = randAngle();
      return new Point(box.position.x + offsetMagnitude * Math.sin(offsetDirection), box.position.y + offsetMagnitude * Math.cos(offsetDirection));
   } else {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      const x = box.position.x + rotateXAroundOrigin(xOffset, yOffset, box.angle);
      const y = box.position.y + rotateYAroundOrigin(xOffset, yOffset, box.angle);
      return new Point(x, y);
   }
}

const countHitboxesIncludingChildren = (hitbox: Hitbox): number => {
   let numHitboxes = 1;
   for (const childHitbox of hitbox.children) {
      if (childHitbox.isPartOfParent) {
         numHitboxes += countHitboxesIncludingChildren(childHitbox);
      }
   }
   return numHitboxes;
}

const countEntityHitboxes = (transformComponent: TransformComponent): number => {
   let numHitboxes = 0;
   for (const rootHitbox of transformComponent.rootHitboxes) {
      numHitboxes += countHitboxesIncludingChildren(rootHitbox);
   } 
   return numHitboxes;
}

const getHitboxHeirarchyIndexedHitbox = (hitbox: Hitbox, i: number, hitboxIdx: number): Hitbox | number => {
   let newI = i;

   if (newI === hitboxIdx) {
      return hitbox;
   }
   
   newI++;

   for (const childHitbox of hitbox.children) {
      const result = getHitboxHeirarchyIndexedHitbox(childHitbox, newI, hitboxIdx);
      if (typeof result === "number") {
         newI = result;
      } else {
         return result;
      }
   }
   
   return newI;
}

const getEntityHeirarchyIndexedHitbox = (transformComponent: TransformComponent, i: number, hitboxIdx: number): Hitbox | number => {
   let _i = 0;

   for (const rootHitbox of transformComponent.rootHitboxes) {
      const result = getHitboxHeirarchyIndexedHitbox(rootHitbox, _i, hitboxIdx);
      if (typeof result === "number") {
         _i = result;
      } else {
         return result;
      }
   }

   throw new Error();
}

export function getRandomPositionInEntity(transformComponent: TransformComponent): Point {
   const numHitboxes = countEntityHitboxes(transformComponent);
   const hitboxIdx = Math.floor(Math.random() * numHitboxes);
   
   const hitbox = getEntityHeirarchyIndexedHitbox(transformComponent, 0, hitboxIdx);
   if (typeof hitbox === "number") {
      throw new Error();
   }
   return getRandomPositionInBox(hitbox.box);
}

export function getRandomPositionOnBoxEdge(box: Box): Point {
   if (boxIsCircular(box)) {
      const offsetMagnitude = box.radius;
      const offsetDirection = randAngle();
      return new Point(box.position.x + offsetMagnitude * Math.sin(offsetDirection), box.position.y + offsetMagnitude * Math.cos(offsetDirection));
   } else {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      let xOffset: number;
      let yOffset: number;
      if (Math.random() < 0.5) {
         xOffset = randFloat(-halfWidth, halfWidth);
         yOffset = halfHeight * randSign();
      } else {
         xOffset = halfWidth * randSign();
         yOffset = randFloat(-halfHeight, halfHeight);
      }

      const x = box.position.x + rotateXAroundOrigin(xOffset, yOffset, box.angle);
      const y = box.position.y + rotateYAroundOrigin(xOffset, yOffset, box.angle);
      return new Point(x, y);
   }
}

export function entityIsVisibleToCamera(entity: Entity): boolean {
   if (getEntityLayer(entity) === getCurrentLayer()) {
      return true;
   }

   // If on a different layer, the entity must be below a dropdown tile
   
   const transformComponent = TransformComponentArray.getComponent(entity);

   const minTileX = Math.floor(transformComponent.boundingAreaMinX / Settings.TILE_SIZE);
   const maxTileX = Math.floor(transformComponent.boundingAreaMaxX / Settings.TILE_SIZE);
   const minTileY = Math.floor(transformComponent.boundingAreaMinY / Settings.TILE_SIZE);
   const maxTileY = Math.floor(transformComponent.boundingAreaMaxY / Settings.TILE_SIZE);
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = surfaceLayer.getTileFromCoords(tileX, tileY);
         if (tile.type === TileType.dropdown) {
            return true;
         }
      }
   }

   return false;
}