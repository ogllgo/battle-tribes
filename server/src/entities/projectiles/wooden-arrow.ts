import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { AMMO_INFO_RECORD, ServerComponentType } from "battletribes-shared/components";
import { EntityType, DamageSource, Entity } from "battletribes-shared/entities";
import { Point, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { applyKnockback, getVelocityMagnitude, PhysicsComponent, PhysicsComponentArray, slowVelocity } from "../../components/PhysicsComponent";
import { EntityRelationship, TribeComponent, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityConfig } from "../../components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { mountEntity, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { ProjectileComponent, ProjectileComponentArray } from "../../components/ProjectileComponent";
import { ItemType } from "battletribes-shared/items/items";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { entityExists, getEntityType } from "../../world";
import Tribe from "../../Tribe";
import { Settings } from "../../../../shared/src/settings";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.tribe
   | ServerComponentType.projectile;

export function createWoodenArrowConfig(tribe: Tribe, owner: Entity): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(new RectangularBox(null, new Point(0, 0), 12, 64, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK & ~HitboxCollisionBit.ARROW_PASSABLE, []);
   transformComponent.addHitbox(hitbox, null);
   
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
export function onWoodenArrowCollision(arrow: Entity, collidingEntity: Entity, collisionPoint: Point): void {
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
      if (creatorTransformComponent.carryRoot === collidingEntityTransformComponent.carryRoot) {
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

   const transformComponent = TransformComponentArray.getComponent(arrow);
   // @Speed: faster to just change its collision group
   if (transformComponent.carryRoot !== arrow) {
      return;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(arrow);

   // Don't damage if the arrow is moving too slow
   if (getVelocityMagnitude(physicsComponent) < 10) {
      return;
   } 

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   const attackHash = "wooden-arrow-" + arrow;
   if (canDamageEntity(healthComponent, attackHash)) {
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   
      const ammoInfo = AMMO_INFO_RECORD[ItemType.wood];
   
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
      
      const damage = 2 * (projectileComponent.isBlocked ? 0.5 : 1);
      const knockback = 150 * (projectileComponent.isBlocked ? 0.5 : 1);
      damageEntity(collidingEntity, arrow, damage, DamageSource.arrow, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, knockback, hitDirection);
      addLocalInvulnerabilityHash(collidingEntity, attackHash, 9);
   
      if (StatusEffectComponentArray.hasComponent(collidingEntity) && ammoInfo.statusEffect !== null) {
         applyStatusEffect(collidingEntity, ammoInfo.statusEffect.type, ammoInfo.statusEffect.durationTicks);
      }
   }

   // Slow down the arrow as it passes through the entity
   slowVelocity(physicsComponent, 10000 * Settings.I_TPS);

   // Lodge the arrow in the entity when it's slow enough
   if (getVelocityMagnitude(physicsComponent) < 50) {
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

      // Adjust the arrow's relative rotation so that it stays pointed in the same direction relative to the colliding entity
      transformComponent.relativeRotation -= collidingEntityTransformComponent.rotation;

      const diffX = transformComponent.position.x - collidingEntityTransformComponent.position.x;
      const diffY = transformComponent.position.y - collidingEntityTransformComponent.position.y;

      const rotatedDiffX = rotateXAroundOrigin(diffX, diffY, -collidingEntityTransformComponent.relativeRotation);
      const rotatedDiffY = rotateYAroundOrigin(diffX, diffY, -collidingEntityTransformComponent.relativeRotation);
      
      mountEntity(arrow, collidingEntity, rotatedDiffX, rotatedDiffY);

      // @Hack: Once the entity gets mounted, the velocity it had at this point in time gets frozen.
      // This is because this "fix carried entity position" code only runs on physics components, and if
      // the arrow gets stuck on a tree then it has no physics component and the velocity never gets overridden
      // with 0.
      // Need to make the fixing carried entity position code run on the transform component instead.
      physicsComponent.selfVelocity.x = 0;
      physicsComponent.selfVelocity.y = 0;
      physicsComponent.externalVelocity.x = 0;
      physicsComponent.externalVelocity.y = 0;
   }
}