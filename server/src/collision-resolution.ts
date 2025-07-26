import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, polarVec2 } from "battletribes-shared/utils";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { CollisionPushInfo, getCollisionPushInfo } from "battletribes-shared/hitbox-collision";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { getComponentArrayRecord } from "./components/ComponentArray";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { getEntityComponentTypes, getEntityType } from "./world";
import { HitboxCollisionPair } from "./collision-detection";
import { getHitboxConnectedMass, getHitboxVelocity, Hitbox, addHitboxVelocity, setHitboxVelocity, translateHitbox, applyForce } from "./hitboxes";

const hitboxesAreTethered = (transformComponent: TransformComponent, hitbox1: Hitbox, hitbox2: Hitbox): boolean => {
   // @INCOMPLETE!
   
   // for ()
   
   // for (const tether of transformComponent.tethers) {
   //    if (tether.hitbox === hitbox1 && tether.originHitbox === hitbox2) {
   //       return true;
   //    }
   //    if (tether.hitbox === hitbox2 && tether.originHitbox === hitbox1) {
   //       return true;
   //    }
   // }
   return false;
}

const resolveHardCollision = (affectedHitbox: Hitbox, hitboxTransformComponent: TransformComponent, pushInfo: CollisionPushInfo): void => {
   // Transform the entity out of the hitbox
   translateHitbox(affectedHitbox, hitboxTransformComponent, polarVec2(pushInfo.amountIn, pushInfo.direction));

   const previousVelocity = getHitboxVelocity(affectedHitbox);

   // Kill all the velocity going into the hitbox
   const bx = Math.sin(pushInfo.direction + Math.PI/2);
   const by = Math.cos(pushInfo.direction + Math.PI/2);
   const velocityProjectionCoeff = previousVelocity.x * bx + previousVelocity.y * by;
   const vx = bx * velocityProjectionCoeff;
   const vy = by * velocityProjectionCoeff;
   setHitboxVelocity(affectedHitbox, vx, vy);
}

const resolveHardCollisionAndFlip = (affectedHitbox: Hitbox, hitboxTransformComponent: TransformComponent, pushInfo: CollisionPushInfo): void => {
   const previousVelocity = getHitboxVelocity(affectedHitbox);
   
   // Transform the entity out of the hitbox
   translateHitbox(affectedHitbox, hitboxTransformComponent, polarVec2(pushInfo.amountIn, pushInfo.direction));

   // Reverse the velocity going into the hitbox
   
   const separationAxisProjX = Math.sin(pushInfo.direction + Math.PI/2);
   const separationAxisProjY = Math.cos(pushInfo.direction + Math.PI/2);
   const pushAxisProjX = Math.sin(pushInfo.direction + Math.PI);
   const pushAxisProjY = Math.cos(pushInfo.direction + Math.PI);
   
   const velocitySeparationCoeff = previousVelocity.x * separationAxisProjX + previousVelocity.y * separationAxisProjY;
   const velocityPushCoeff = previousVelocity.x * pushAxisProjX + previousVelocity.y * pushAxisProjY;
   // Keep the velocity in the separation axis
   setHitboxVelocity(affectedHitbox, separationAxisProjY * velocitySeparationCoeff, separationAxisProjX * velocitySeparationCoeff);
   // Reverse the velocity in the push axis
   addHitboxVelocity(affectedHitbox, new Point(-pushAxisProjX * velocityPushCoeff, -pushAxisProjY * velocityPushCoeff));
}

const resolveSoftCollision = (affectedHitbox: Hitbox, pushingHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   const pushForce = Settings.ENTITY_PUSH_FORCE * pushInfo.amountIn * pushingHitbox.mass;
   applyForce(affectedHitbox, polarVec2(pushForce, pushInfo.direction));
}

export function collide(affectedEntity: Entity, collidingEntity: Entity, collidingHitboxPairs: ReadonlyArray<HitboxCollisionPair>): void {
   const affectedEntityTransformComponent = TransformComponentArray.getComponent(affectedEntity);
   
   const componentTypes = getEntityComponentTypes(affectedEntity);
   const componentArrayRecord = getComponentArrayRecord();
   
   // @Speed
   // @HACK @TEMPORARY
   const affectedEntityHitbox = affectedEntityTransformComponent.hitboxes[0];
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   const collidingEntityHitbox = collidingEntityTransformComponent.hitboxes[0];
   const collisionPoint = new Point((affectedEntityHitbox.box.position.x + affectedEntityHitbox.box.position.x) / 2, (affectedEntityHitbox.box.position.y + affectedEntityHitbox.box.position.y) / 2);
   
   for (let i = 0; i < collidingHitboxPairs.length; i++) {
      const pair = collidingHitboxPairs[i];
      const affectedHitbox = pair[0];
      const collidingHitbox = pair[1];

      // @HACK @SPEED: There is some very weird behaviour when two hitboxes are tethered and also can collide, so this shitter is here to prevent that
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      if (hitboxesAreTethered(affectedEntityTransformComponent, affectedHitbox, collidingHitbox) || hitboxesAreTethered(collidingEntityTransformComponent, affectedHitbox, collidingHitbox)) {
         continue;
      }

      // @Hack: this used to be after the collision physics code, but the cow hitbox collision function needs to know the velocity of the entity just before the collision happens.
      for (let i = 0; i < componentTypes.length; i++) {
         const componentType = componentTypes[i];
         const componentArray = componentArrayRecord[componentType];

         if (typeof componentArray.onHitboxCollision !== "undefined") {
            componentArray.onHitboxCollision(affectedHitbox, collidingHitbox, collisionPoint);
         }
      }
      
      if (!affectedHitbox.isStatic) {
         // @Bug: This isn't right! Should instead keep track of the collision data from the collision detection code, and use it here.
         // Currently there are issues as one collision pair being resolved can change the push info away from what was used in detection.
         // Which is extra bad cause sometimes collisions which aren't actually happening can have their push info gotten. previously this has causesd
         // a nasty to resolve crash, and i put in a hacky solution. would be great to fix
         const pushInfo = getCollisionPushInfo(affectedHitbox.box, collidingHitbox.box);

         if (collidingHitbox.collisionType === HitboxCollisionType.hard) {
            resolveHardCollision(affectedHitbox, affectedEntityTransformComponent, pushInfo);
         } else {
            resolveSoftCollision(affectedHitbox, collidingHitbox, pushInfo);
         }

         // @Cleanup: Should we just clean it immediately here?
         affectedEntityTransformComponent.isDirty = true;
      }
   }

   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType];

      if (typeof componentArray.onEntityCollision !== "undefined") {
         componentArray.onEntityCollision(affectedEntity, collidingEntity, collidingHitboxPairs);
      }
   }

   // @Incomplete
   // switch (entityType) {
   //    // @Cleanup:
   //    case EntityType.woodenArrow: onWoodenArrowCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaWoodenBolt: onBallistaWoodenBoltCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaRock: onBallistaRockCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaSlimeball: onBallistaSlimeballCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaFrostcicle: onBallistaFrostcicleCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.spitPoisonArea: onSpitPoisonCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.battleaxeProjectile: onBattleaxeProjectileCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.iceArrow: onIceArrowCollision(entity, pushingEntity); break;
   //    case EntityType.pebblum: onPebblumCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.golem: onGolemCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.floorSpikes:
   //    case EntityType.wallSpikes: onSpikesCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.floorPunjiSticks:
   //    case EntityType.wallPunjiSticks: onPunjiSticksCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.embrasure: onEmbrasureCollision(pushingEntity, pushedHitboxIdx); break;
   // }
}

/** If no collision is found, does nothing. */
export function resolveWallCollision(hitbox: Hitbox, subtileX: number, subtileY: number): void {
   // @Copynpaste from boxIsCollidingWithSubtile
   // @Speed
   const position = new Point((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE);
   const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
   
   if (!hitbox.box.isColliding(tileBox)) {
      return;
   }

   const entity = hitbox.entity;
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const pushInfo = getCollisionPushInfo(hitbox.box, tileBox);
   if (getEntityType(entity) === EntityType.guardianSpikyBall) {
      resolveHardCollisionAndFlip(hitbox, transformComponent, pushInfo);
   } else {
      resolveHardCollision(hitbox, transformComponent, pushInfo);
   }

   const componentTypes = getEntityComponentTypes(entity);
   const componentArrayRecord = getComponentArrayRecord();

   // Call wall collision events
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType];

      if (typeof componentArray.onWallCollision !== "undefined") {
         componentArray.onWallCollision(entity);
      }
   }
   
}