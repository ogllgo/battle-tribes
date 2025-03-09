import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { CollisionPushInfo, getCollisionPushInfo } from "battletribes-shared/hitbox-collision";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { getComponentArrayRecord } from "./components/ComponentArray";
import { HitboxCollisionType, updateBox } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { getEntityComponentTypes, getEntityType } from "./world";
import { HitboxCollisionPair } from "./collision-detection";
import { getHitboxConnectedMass, Hitbox } from "./hitboxes";

const hitboxesAreTethered = (transformComponent: TransformComponent, hitbox1: Hitbox, hitbox2: Hitbox): boolean => {
   for (const tether of transformComponent.tethers) {
      if (tether.hitbox === hitbox1 && tether.otherHitbox === hitbox2) {
         return true;
      }
      if (tether.hitbox === hitbox2 && tether.otherHitbox === hitbox1) {
         return true;
      }
   }
   return false;
}

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

const resolveHardCollisionAndFlip = (affectedHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   // Transform the entity out of the hitbox
   affectedHitbox.box.position.x += pushInfo.amountIn * Math.sin(pushInfo.direction);
   affectedHitbox.box.position.y += pushInfo.amountIn * Math.cos(pushInfo.direction);

   // Reverse the velocity going into the hitbox
   
   const separationAxisProjX = Math.sin(pushInfo.direction + Math.PI/2);
   const separationAxisProjY = Math.cos(pushInfo.direction + Math.PI/2);
   const pushAxisProjX = Math.sin(pushInfo.direction + Math.PI);
   const pushAxisProjY = Math.cos(pushInfo.direction + Math.PI);

   const velocitySeparationCoeff = affectedHitbox.velocity.x * separationAxisProjX + affectedHitbox.velocity.y * separationAxisProjY;
   const velocityPushCoeff = affectedHitbox.velocity.x * pushAxisProjX + affectedHitbox.velocity.y * pushAxisProjY;
   // Keep the velocity in the separation axis
   affectedHitbox.velocity.x = separationAxisProjX * velocitySeparationCoeff;
   affectedHitbox.velocity.y = separationAxisProjY * velocitySeparationCoeff;
   // Reverse the velocity in the push axis
   affectedHitbox.velocity.x -= pushAxisProjX * velocityPushCoeff;
   affectedHitbox.velocity.y -= pushAxisProjY * velocityPushCoeff;
}

const resolveSoftCollision = (affectedHitbox: Hitbox, pushingHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   const totalMass = getHitboxConnectedMass(affectedHitbox);
   if (totalMass !== 0) {
      // Force gets greater the further into each other the entities are
      const distMultiplier = Math.pow(pushInfo.amountIn, 1.1);
      const pushForce = Settings.ENTITY_PUSH_FORCE * Settings.I_TPS * distMultiplier * pushingHitbox.mass / totalMass;
      
      affectedHitbox.velocity.x += pushForce * Math.sin(pushInfo.direction);
      affectedHitbox.velocity.y += pushForce * Math.cos(pushInfo.direction);
   }
}

export function collide(affectedEntity: Entity, collidingEntity: Entity, collidingHitboxPairs: ReadonlyArray<HitboxCollisionPair>): void {
   const affectedEntityTransformComponent = TransformComponentArray.getComponent(affectedEntity);
   
   const componentTypes = getEntityComponentTypes(affectedEntity);
   const componentArrayRecord = getComponentArrayRecord();
   
   // @Speed
   // @HACK @TEMPORARY
   const affectedEntityHitbox = affectedEntityTransformComponent.children[0] as Hitbox;
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   const collidingEntityHitbox = collidingEntityTransformComponent.children[0];
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
            componentArray.onHitboxCollision(affectedEntity, collidingEntity, affectedHitbox, collidingHitbox, collisionPoint);
         }
      }
      
      // @Speed: what if there are many many hitbox pairs? will this be slow:?
      if (PhysicsComponentArray.hasComponent(affectedEntity)) {
         const physicsComponent = PhysicsComponentArray.getComponent(affectedEntity);
         if (!physicsComponent.isImmovable) {
            const pushInfo = getCollisionPushInfo(affectedHitbox.box, collidingHitbox.box);

            if (collidingHitbox.collisionType === HitboxCollisionType.hard) {
               resolveHardCollision(affectedHitbox, pushInfo);
            } else {
               resolveSoftCollision(affectedHitbox, collidingHitbox, pushInfo);
            }
   
            // @Cleanup: Should we just clean it immediately here?
            affectedEntityTransformComponent.isDirty = true;
         }
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
   //    case EntityType.frozenYeti: onFrozenYetiCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.rockSpikeProjectile: onRockSpikeProjectileCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.spearProjectile: onSpearProjectileCollision(entity, pushingEntity, collisionPoint); break;
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
export function resolveWallCollision(entity: Entity, hitbox: Hitbox, subtileX: number, subtileY: number): void {
   // @Copynpaste from boxIsCollidingWithSubtile
   // @Speed
   const position = new Point((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE);
   const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
   updateBox(tileBox, position.x, position.y, 0);
   
   if (!hitbox.box.isColliding(tileBox)) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const pushInfo = getCollisionPushInfo(hitbox.box, tileBox);
   if (getEntityType(entity) === EntityType.guardianSpikyBall) {
      resolveHardCollisionAndFlip(hitbox, pushInfo);
   } else {
      resolveHardCollision(hitbox, pushInfo);
   }

   transformComponent.isDirty = true;

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