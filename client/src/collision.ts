import { Settings } from "battletribes-shared/settings";
import { collisionBitsAreCompatible, CollisionPushInfo, getCollisionPushInfo } from "battletribes-shared/hitbox-collision";
import { Point } from "battletribes-shared/utils";
import { Box, HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { Entity } from "battletribes-shared/entities";
import { entityChildIsHitbox, TransformComponentArray, TransformNode } from "./entity-components/server-components/TransformComponent";
import Chunk from "./Chunk";
import { PhysicsComponentArray } from "./entity-components/server-components/PhysicsComponent";
import { getEntityLayer } from "./world";
import Layer from "./Layer";
import { getComponentArrays } from "./entity-components/ComponentArray";
import { playerInstance } from "./player";
import { Hitbox } from "./hitboxes";
import CircularBox from "../../shared/src/boxes/CircularBox";

interface EntityPairCollisionInfo {
   readonly minEntityInvolvedHitboxes: Array<Hitbox>;
   readonly maxEntityInvolvedHitboxes: Array<Hitbox>;
}

type CollisionPairs = Record<number, Record<number, EntityPairCollisionInfo | null>>;

const resolveHardCollision = (affectedHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   // Transform the entity out of the hitbox
   affectedHitbox.box.position.x += pushInfo.amountIn * Math.sin(pushInfo.direction);
   affectedHitbox.box.position.y += pushInfo.amountIn * Math.cos(pushInfo.direction);

   // Kill all the velocity going into the hitbox
   const bx = Math.sin(pushInfo.direction + Math.PI/2);
   const by = Math.cos(pushInfo.direction + Math.PI/2);
   const velocityProjectionCoeff = affectedHitbox.velocity.x * bx + affectedHitbox.velocity.y * by;
   affectedHitbox.velocity.x = bx * velocityProjectionCoeff;
   affectedHitbox.velocity.y = by * velocityProjectionCoeff;
}

const resolveSoftCollision = (entity: Entity, affectedHitbox: Hitbox, pushingHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent.totalMass !== 0) {
      const pushForce = Settings.ENTITY_PUSH_FORCE * Settings.I_TPS * pushInfo.amountIn * pushingHitbox.mass / transformComponent.totalMass;
      
      affectedHitbox.velocity.x += pushForce * Math.sin(pushInfo.direction);
      affectedHitbox.velocity.y += pushForce * Math.cos(pushInfo.direction);
   }
}

export function collide(entity: Entity, collidingEntity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox, isPushed: boolean): void {
   if (isPushed && PhysicsComponentArray.hasComponent(entity)) {
      const pushInfo = getCollisionPushInfo(pushedHitbox.box, pushingHitbox.box);
      if (pushingHitbox.collisionType === HitboxCollisionType.hard) {
         resolveHardCollision(pushedHitbox, pushInfo);
      } else {
         resolveSoftCollision(entity, pushedHitbox, pushingHitbox, pushInfo);
      }
   }

   // @Speed
   const componentArrays = getComponentArrays();
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (typeof componentArray.onCollision !== "undefined" && componentArray.hasComponent(entity)) {
         componentArray.onCollision(entity, collidingEntity, pushedHitbox, pushingHitbox);
      }
   }
}

const getEntityPairCollisionInfo = (entity1: Entity, entity2: Entity): EntityPairCollisionInfo | null => {
   const transformComponent1 = TransformComponentArray.getComponent(entity1);
   const transformComponent2 = TransformComponentArray.getComponent(entity2);
   
   // AABB bounding area check
   if (transformComponent1.boundingAreaMinX > transformComponent2.boundingAreaMaxX || // minX(1) > maxX(2)
       transformComponent1.boundingAreaMaxX < transformComponent2.boundingAreaMinX || // maxX(1) < minX(2)
       transformComponent1.boundingAreaMinY > transformComponent2.boundingAreaMaxY || // minY(1) > maxY(2)
       transformComponent1.boundingAreaMaxY < transformComponent2.boundingAreaMinY) { // maxY(1) < minY(2)
      return null;
   }

   const entity1InvolvedHitboxes = new Array<Hitbox>();
   const entity2InvolvedHitboxes = new Array<Hitbox>();
   
   // More expensive hitbox check
   for (const hitbox of transformComponent1.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }
      const box = hitbox.box;

      for (const otherHitbox of transformComponent2.children) {
         if (!entityChildIsHitbox(otherHitbox)) {
            continue;
         }
         const otherBox = otherHitbox.box;

         if (!collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, otherHitbox.collisionMask, otherHitbox.collisionBit)) {
            continue;
         }
         
         // If the objects are colliding, add the colliding object and this object
         if (box.isColliding(otherBox)) {
            entity1InvolvedHitboxes.push(hitbox);
            entity2InvolvedHitboxes.push(otherHitbox);
         }
      }
   }

   if (entity1InvolvedHitboxes.length > 0) {
      return {
         minEntityInvolvedHitboxes: entity1 < entity2 ? entity1InvolvedHitboxes : entity2InvolvedHitboxes,
         maxEntityInvolvedHitboxes: entity1 < entity2 ? entity2InvolvedHitboxes : entity1InvolvedHitboxes
      };
   }
   return null;
}

const entityCollisionPairHasAlreadyBeenChecked = (collisionPairs: CollisionPairs, minEntity: Entity, maxEntity: Entity): boolean => {
   return typeof collisionPairs[minEntity] !== "undefined" && typeof collisionPairs[minEntity][maxEntity] !== "undefined";
}

const collectEntityCollisionsWithChunk = (collisionPairs: CollisionPairs, entity1: Entity, chunk: Chunk, a: boolean): void => {
   for (let i = 0; i < chunk.entities.length; i++) {
      const entity2 = chunk.entities[i];
      // @Speed
      if (entity1 === entity2) {
         continue;
      }

      // @Speed: re-gotten further in the line
      const entity1TransformComponent = TransformComponentArray.getComponent(entity1);
      const entity2TransformComponent = TransformComponentArray.getComponent(entity2);

      // Make sure the entities aren't in the same carry heirarchy
      if (entity1TransformComponent.rootEntity === entity2TransformComponent.rootEntity) {
         continue;
      }

      let minID: number;
      let maxID: number;
      if (entity1 > entity2) {
         minID = entity2;
         maxID = entity1;
      } else {
         minID = entity1;
         maxID = entity2;
      }
      if (entityCollisionPairHasAlreadyBeenChecked(collisionPairs, minID, maxID)) {
         continue;
      }

      const collisionInfo = getEntityPairCollisionInfo(entity1, entity2);
      if (collisionInfo !== null) {
         if (typeof collisionPairs[minID] === "undefined") {
            collisionPairs[minID] = {};
         }
         collisionPairs[minID][maxID] = collisionInfo;
      }
   }
}

const resolveCollisionPairs = (collisionPairs: CollisionPairs, onlyResolvePlayerCollisions: boolean): void => {
   // @Speed @Garbage
   for (const entity1 of Object.keys(collisionPairs).map(Number)) {
      for (const entity2 of Object.keys(collisionPairs[entity1]).map(Number)) {
         const collisionInfo = collisionPairs[entity1][entity2];
         if (collisionInfo === null) {
            continue;
         }

         // Note: from here, entity1 < entity2 (by definition)

         for (let i = 0; i < collisionInfo.minEntityInvolvedHitboxes.length; i++) {
            const entity1Hitbox = collisionInfo.minEntityInvolvedHitboxes[i];
            const entity2Hitbox = collisionInfo.maxEntityInvolvedHitboxes[i];

            collide(entity1, entity2, entity1Hitbox, entity2Hitbox, !onlyResolvePlayerCollisions || entity1 === playerInstance);
            collide(entity2, entity1, entity2Hitbox, entity1Hitbox, !onlyResolvePlayerCollisions || entity2 === playerInstance);
         }
      }
   }
}

// @CLEANP: unused?
export function resolveEntityCollisions(layer: Layer): void {
   const collisionPairs: CollisionPairs = {};
   
   const numChunks = Settings.BOARD_SIZE * Settings.BOARD_SIZE;
   for (let i = 0; i < numChunks; i++) {
      const chunk = layer.chunks[i];

      // @Bug: collision can happen multiple times
      // @Speed: physics-physics comparisons happen twice
      // For all physics entities, check for collisions with all other entities in the chunk
      for (let j = 0; j < chunk.physicsEntities.length; j++) {
         const entity1ID = chunk.physicsEntities[j];
         
         collectEntityCollisionsWithChunk(collisionPairs, entity1ID, chunk, false);
      }
   }

   resolveCollisionPairs(collisionPairs, false);
}

export function resolvePlayerCollisions(): void {
   const collisionPairs: CollisionPairs = {};

   const transformComponent = TransformComponentArray.getComponent(playerInstance!);

   for (const chunk of transformComponent.chunks) {
      collectEntityCollisionsWithChunk(collisionPairs, playerInstance!, chunk, true);
   }

   resolveCollisionPairs(collisionPairs, true);
}

export function resolveWallCollisions(entity: Entity): boolean {
   let hasMoved = false;
   const layer = getEntityLayer(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < transformComponent.children.length; i++) {
      const hitbox = transformComponent.children[i];
      if (!entityChildIsHitbox(hitbox) || hitbox.flags.includes(HitboxFlag.IGNORES_WALL_COLLISIONS)) {
         continue;
      }
      
      const box = hitbox.box;
      
      const boundsMinX = box.calculateBoundsMinX();
      const boundsMaxX = box.calculateBoundsMaxX();
      const boundsMinY = box.calculateBoundsMinY();
      const boundsMaxY = box.calculateBoundsMaxY();
      
      // @Hack: use actual bounding area
      const minSubtileX = Math.max(Math.floor(boundsMinX / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
      const maxSubtileX = Math.min(Math.floor(boundsMaxX / Settings.SUBTILE_SIZE), (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
      const minSubtileY = Math.max(Math.floor(boundsMinY / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
      const maxSubtileY = Math.min(Math.floor(boundsMaxY / Settings.SUBTILE_SIZE), (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   
      // @Incomplete
      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            if (!layer.subtileIsWall(subtileX, subtileY)) {
               continue;
            }

            // @Garbage
            const tileCenterX = (subtileX + 0.5) * Settings.SUBTILE_SIZE;
            const tileCenterY = (subtileY + 0.5) * Settings.SUBTILE_SIZE;
            const tileBox = new RectangularBox(new Point(tileCenterX, tileCenterY), new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
            
            // Check if the tile is colliding
            if (box.isColliding(tileBox)) {
               const pushInfo = getCollisionPushInfo(box, tileBox);
               resolveHardCollision(hitbox, pushInfo);
               hasMoved = true;
            }
         }
      }
   }
   return hasMoved;
}

const boxHasCollisionWithHitboxes = (box: Box, children: ReadonlyArray<TransformNode>, epsilon: number = 0): boolean => {
   for (let i = 0; i < children.length; i++) {
      const otherHitbox = children[i];
      if (entityChildIsHitbox(otherHitbox) && box.isColliding(otherHitbox.box, epsilon)) {
         return true;
      }
   }
   return false;
}

// @Copynpaste
export function getHitboxesCollidingEntities(layer: Layer, hitboxes: ReadonlyArray<Hitbox>, epsilon: number = 0): Array<Entity> {
   const collidingEntities = new Array<Entity>();
   const seenEntityIDs = new Set<number>();
   
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];
      const box = hitbox.box;

      let minX = box.calculateBoundsMinX();
      let maxX = box.calculateBoundsMaxX();
      let minY = box.calculateBoundsMinY();
      let maxY = box.calculateBoundsMaxY();
      if (minX < 0) {
         minX = 0;
      }
      if (maxX >= Settings.BOARD_UNITS) {
         maxX = Settings.BOARD_UNITS - 1;
      }
      if (minY < 0) {
         minY = 0;
      }
      if (maxY >= Settings.BOARD_UNITS) {
         maxY = Settings.BOARD_UNITS - 1;
      }
      
      const minChunkX = Math.max(Math.floor(minX / Settings.CHUNK_UNITS), 0);
      const maxChunkX = Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
      const minChunkY = Math.max(Math.floor(minY / Settings.CHUNK_UNITS), 0);
      const maxChunkY = Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            for (let i = 0; i < chunk.entities.length; i++) {
               const entity = chunk.entities[i];
               if (seenEntityIDs.has(entity)) {
                  continue;
               }

               seenEntityIDs.add(entity);
               
               const entityTransformComponent = TransformComponentArray.getComponent(entity);
               if (boxHasCollisionWithHitboxes(box, entityTransformComponent.children, epsilon)) {
                  collidingEntities.push(entity);
               }
            }
         }
      }
   }

   return collidingEntities;
}

// @Cleanup: remove
const testCircularBox = new CircularBox(new Point(0, 0), new Point(0, 0), 0, 0);

// @Location
export function getEntitiesInRange(layer: Layer, x: number, y: number, range: number): Array<Entity> {
   const minChunkX = Math.max(Math.min(Math.floor((x - range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((x + range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((y - range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((y + range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   testCircularBox.radius = range;
   testCircularBox.position.x = x;
   testCircularBox.position.y = y;

   const visionRangeSquared = Math.pow(range, 2);
   
   const seenIDs = new Set<number>();
   const entities = new Array<Entity>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            // Don't add existing game objects
            if (seenIDs.has(entity)) {
               continue;
            }

            const transformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = transformComponent.children[0] as Hitbox;
            if (Math.pow(x - entityHitbox.box.position.x, 2) + Math.pow(y - entityHitbox.box.position.y, 2) <= visionRangeSquared) {
               entities.push(entity);
               seenIDs.add(entity);
               continue;
            }

            // If the test hitbox can 'see' any of the game object's hitboxes, it is visible
            for (const hitbox of transformComponent.children) {
               if (entityChildIsHitbox(hitbox) && testCircularBox.isColliding(hitbox.box)) {
                  entities.push(entity);
                  seenIDs.add(entity);
                  break;
               }
            }
         }
      }  
   }

   return entities;
}