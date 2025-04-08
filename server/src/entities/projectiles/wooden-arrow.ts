import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { AMMO_INFO_RECORD, ServerComponentType } from "battletribes-shared/components";
import { EntityType, DamageSource, Entity } from "battletribes-shared/entities";
import { Point, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, hitEntity } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { EntityRelationship, TribeComponent, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityConfig } from "../../components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { addHitboxToTransformComponent, attachEntity, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { ProjectileComponent, ProjectileComponentArray } from "../../components/ProjectileComponent";
import { ItemType } from "battletribes-shared/items/items";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { entityExists, getEntityType } from "../../world";
import Tribe from "../../Tribe";
import { Settings } from "../../../../shared/src/settings";
import { applyKnockback, createHitbox, getHitboxVelocity, Hitbox } from "../../hitboxes";

export function createWoodenArrowConfig(position: Point, rotation: number, tribe: Tribe, owner: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 12, 64), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.arrowPassable, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByGroundFriction = false;
   physicsComponent.isImmovable = true;

   const tribeComponent = new TribeComponent(tribe);

   const projectileComponent = new ProjectileComponent(owner);
   
   return {
      entityType: EntityType.woodenArrow,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.projectile]: projectileComponent
      },
      lights: []
   };
}

// @Cleanup: Copy and paste
export function onWoodenArrowHitboxCollision(arrow: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   // Ignore friendlies, and friendly buildings if the ignoreFriendlyBuildings flag is set
   const relationship = getEntityRelationship(arrow, collidingEntity);
   if (relationship === EntityRelationship.friendly) {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(arrow);
   const collidingEntityType = getEntityType(collidingEntity);

   // Collisions with embrasures are handled in the embrasures collision function
   if (collidingEntityType === EntityType.embrasure) {
      const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
      if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
         return;
      }
   }

   // Don't collide with anything attached to the owner
   const projectileComponent = ProjectileComponentArray.getComponent(arrow);
   if (entityExists(projectileComponent.creator)) {
      const creatorTransformComponent = TransformComponentArray.getComponent(projectileComponent.creator);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      if (creatorTransformComponent.rootEntity === collidingEntityTransformComponent.rootEntity) {
         return;
      }
   }

   // @Hack: do with collision bits
   // Pass over friendly spikes
   if (collidingEntityType === EntityType.floorSpikes || collidingEntityType === EntityType.wallSpikes || collidingEntityType === EntityType.floorPunjiSticks || collidingEntityType === EntityType.wallPunjiSticks) {
      const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
      if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
         return;
      }
   }

   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Don't collide with anything when the arrow is being carried
   // @Speed: faster to just change its collision group
   const transformComponent = TransformComponentArray.getComponent(arrow);
   if (transformComponent.rootEntity !== arrow) {
      return;
   }

   // Don't damage if the arrow is moving too slow
   if (getHitboxVelocity(affectedHitbox).length() < 10) {
      return;
   } 

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   const attackHash = "wooden-arrow-" + arrow;
   if (canDamageEntity(healthComponent, attackHash)) {
      const ammoInfo = AMMO_INFO_RECORD[ItemType.wood];
   
      const hitDirection = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);
      
      const attacker = entityExists(projectileComponent.creator) ? projectileComponent.creator : arrow;

      const damage = 2 * (projectileComponent.isBlocked ? 0.5 : 1);
      const knockback = 150 * (projectileComponent.isBlocked ? 0.5 : 1);
      hitEntity(collidingEntity, attacker, damage, DamageSource.arrow, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, collidingHitbox, knockback, hitDirection);
      addLocalInvulnerabilityHash(collidingEntity, attackHash, 9);
   
      if (StatusEffectComponentArray.hasComponent(collidingEntity) && ammoInfo.statusEffect !== null) {
         applyStatusEffect(collidingEntity, ammoInfo.statusEffect.type, ammoInfo.statusEffect.durationTicks);
      }
   }

   // Lodge the arrow in the entity when it's slow enough
   if (getHitboxVelocity(affectedHitbox).lengthSquared() < 50) {
      attachEntity(arrow, collidingEntity, collidingHitbox, false);
   }
}