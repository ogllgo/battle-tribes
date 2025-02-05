import { CollisionGroup, collisionGroupsCanCollide } from "battletribes-shared/collision-groups";
import { Entity } from "battletribes-shared/entities";
import { collisionBitsAreCompatible } from "battletribes-shared/hitbox-collision";
import { Settings } from "battletribes-shared/settings";
import { collide } from "./collision";
import { TransformComponentArray } from "./components/TransformComponent";
import Layer from "./Layer";

type EntityCollisionPair = [affectedEntity: Entity, collidingEntity: Entity];
export type HitboxCollisionPair = [affectedEntityIdx: number, collidingEntityIdx: number];

export interface EntityPairCollisionInfo {
   readonly collidingEntity: Entity;
   readonly collidingHitboxPairs: ReadonlyArray<HitboxCollisionPair>;
}

/** For each affected entity, stores info about colliding entities */
export type GlobalCollisionInfo = Partial<Record<number, Array<EntityPairCollisionInfo>>>;

// Pair the colliding collision groups
const collisionGroupPairs = new Array<[pushingGroup: CollisionGroup, pushedGroup: CollisionGroup]>();
for (let pushingGroup: CollisionGroup = 0; pushingGroup < CollisionGroup._LENGTH_; pushingGroup++) {
   for (let pushedGroup: CollisionGroup = 0; pushedGroup < CollisionGroup._LENGTH_; pushedGroup++) {
      if (collisionGroupsCanCollide(pushingGroup, pushedGroup)) {
         collisionGroupPairs.push([pushingGroup, pushedGroup]);
      }
   }
}

const markEntityCollisions = (entityCollisionPairs: Array<EntityCollisionPair>, collisionInfo: GlobalCollisionInfo, affectedEntity: Entity, collidingEntity: Entity): void => {
   const affectedEntityTransformComponent = TransformComponentArray.getComponent(affectedEntity);
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   
   // AABB bounding area check
   if (affectedEntityTransformComponent.boundingAreaMinX > collidingEntityTransformComponent.boundingAreaMaxX || // minX(1) > maxX(2)
       affectedEntityTransformComponent.boundingAreaMaxX < collidingEntityTransformComponent.boundingAreaMinX || // maxX(1) < minX(2)
       affectedEntityTransformComponent.boundingAreaMinY > collidingEntityTransformComponent.boundingAreaMaxY || // minY(1) > maxY(2)
       affectedEntityTransformComponent.boundingAreaMaxY < collidingEntityTransformComponent.boundingAreaMinY) { // maxY(1) < minY(2)
      return;
   }

   // Check if the collisions have already been marked
   // @Speed: perhaps modify the GlobalCollisionInfo type so we can skip if there was no collision. but see if that would actually make it faster
   if (typeof collisionInfo[affectedEntity] !== "undefined") {
      for (let i = 0; i < collisionInfo[affectedEntity]!.length; i++) {
         const pairCollisionInfo = collisionInfo[affectedEntity]![i];
         if (pairCollisionInfo.collidingEntity === collidingEntity) {
            return;
         }
      }
   }
   
   // Check hitboxes
   const collidingHitboxPairs = new Array<HitboxCollisionPair>();
   const numHitboxes = affectedEntityTransformComponent.hitboxes.length;
   const numOtherHitboxes = collidingEntityTransformComponent.hitboxes.length;
   for (let i = 0; i < numHitboxes; i++) {
      const hitbox = affectedEntityTransformComponent.hitboxes[i];
      const box = hitbox.box;

      for (let j = 0; j < numOtherHitboxes; j++) {
         const otherHitbox = collidingEntityTransformComponent.hitboxes[j];
         const otherBox = otherHitbox.box;

         // If the objects are colliding, add the colliding object and this object
         if (collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, otherHitbox.collisionMask, otherHitbox.collisionBit) && box.isColliding(otherBox)) {
            // Check for existing collision info
            collidingHitboxPairs.push([i, j]);
         }
      }
   }

   if (collidingHitboxPairs.length > 0) {
      if (typeof collisionInfo[affectedEntity] === "undefined") {
         collisionInfo[affectedEntity] = [];
      }

      const pairCollisionInfo: EntityPairCollisionInfo = {
         collidingEntity: collidingEntity,
         collidingHitboxPairs: collidingHitboxPairs
      };
      collisionInfo[affectedEntity]!.push(pairCollisionInfo);

      entityCollisionPairs.push([affectedEntity, collidingEntity]);
   }
}

export function resolveEntityCollisions(layer: Layer): void {
   // @Speed: For each collision group there are plenty of 'inactive chunks', where there are 0 entities of that collision
   // group. Skipping inactive chunks could provide a bit of a speedup.
   // Total of 2m chunk pair checks each second for 8 true val's - not ideal!
   // Main goal: Completely skip pair checks where both chunks are inactive. Ideally we would also be able to completely skip pair checks where only 1 chunk is inactive.

   /*
                                 v  only care about this! like 95% of pairs are useless
                    none   one   both
   surfaceLayer     23601  7942  1225
   undergroundLayer 29313  3274  181

   */
   
   // @Speed: Collision chunks literally just have an array, so why not just have them be arrays? But do the above optimisation first.
   
   const entityCollisionPairs = new Array<EntityCollisionPair>();
   const globalCollisionInfo: GlobalCollisionInfo = {};

   for (let i = 0; i < collisionGroupPairs.length; i++) {
      const pair = collisionGroupPairs[i];
      const pushingGroup = pair[0];
      const pushedGroup = pair[1];

      const pushingChunks = layer.collisionGroupChunks[pushingGroup];
      const pushedChunks = layer.collisionGroupChunks[pushedGroup];
      
      for (let chunkIdx = 0; chunkIdx < Settings.BOARD_SIZE * Settings.BOARD_SIZE; chunkIdx++) {
         const pushingChunk = pushingChunks[chunkIdx];
         const pushedChunk = pushedChunks[chunkIdx];

         for (let j = 0; j < pushingChunk.entities.length; j++) {
            const affectedEntity = pushingChunk.entities[j];

            for (let k = 0; k < pushedChunk.entities.length; k++) {
               const collidingEntity = pushedChunk.entities[k];

               // @Speed: This check is only needed if the pushingGroup is the pushedGroup.
               if (affectedEntity === collidingEntity) {
                  continue;
               }

               // @Speed: We re-get these components in markEntityCollisions
               const affectedEntityTransformComponent = TransformComponentArray.getComponent(affectedEntity);
               const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

               // Make sure the entities aren't in the same carry heirarchy
               if (affectedEntityTransformComponent.carryRoot === collidingEntityTransformComponent.carryRoot) {
                  continue;
               }

               markEntityCollisions(entityCollisionPairs, globalCollisionInfo, affectedEntity, collidingEntity);
            }
         }
      }
   }

   for (let i = 0; i < entityCollisionPairs.length; i++) {
      const pair = entityCollisionPairs[i];
      const affectedEntity = pair[0];
      const collidingEntity = pair[1];

      // @Speed? What does this even do?
      let collisionInfo: EntityPairCollisionInfo | undefined;
      for (let j = 0; j < globalCollisionInfo[affectedEntity]!.length; j++) {
         const currentCollisionInfo = globalCollisionInfo[affectedEntity]![j];
         if (currentCollisionInfo.collidingEntity === collidingEntity) {
            collisionInfo = currentCollisionInfo;
            break;
         }
      }
      if (typeof collisionInfo === "undefined") {
         throw new Error();
      }

      collide(affectedEntity, collidingEntity, collisionInfo.collidingHitboxPairs);
   }

   layer.globalCollisionInfo = globalCollisionInfo;
}