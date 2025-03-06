import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityType, Entity } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { createEntityConfig, EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import Tribe from "../../Tribe";
import { createHitbox } from "../../hitboxes";

export function createBallistaFrostcicleConfig(position: Point, rotation: number, tribe: Tribe, creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent(0);

   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 12, 80), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK & ~HitboxCollisionBit.ARROW_PASSABLE, []);
   transformComponent.addHitbox(hitbox, null);

   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByGroundFriction = false;
   physicsComponent.isImmovable = true;

   const tribeComponent = new TribeComponent(tribe);

   const projectileComponent = new ProjectileComponent(creator);
   
   return createEntityConfig(
      EntityType.ballistaFrostcicle,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.projectile]: projectileComponent
      },
      []
   );
}

// @Cleanup: Copy and paste
// export function onBallistaFrostcicleCollision(arrow: Entity, collidingEntity: Entity, collisionPoint: Point): void {
//    // Ignore friendlies, and friendly buildings if the ignoreFriendlyBuildings flag is set
//    const relationship = getEntityRelationship(arrow, collidingEntity);
//    if (relationship === EntityRelationship.friendly || relationship === EntityRelationship.friendlyBuilding) {
//       return;
//    }
   
//    const tribeComponent = TribeComponentArray.getComponent(arrow);
//    const collidingEntityType = getEntityType(collidingEntity);

//    // Collisions with embrasures are handled in the embrasures collision function
//    if (collidingEntityType === EntityType.embrasure) {
//       const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
//       if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
//          return;
//       }
//    }

//    // @Hack: do with collision bits
//    // Pass over friendly spikes
//    if (collidingEntityType === EntityType.floorSpikes || collidingEntityType === EntityType.wallSpikes || collidingEntityType === EntityType.floorPunjiSticks || collidingEntityType === EntityType.wallPunjiSticks) {
//       const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
//       if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
//          return;
//       }
//    }

//    if (HealthComponentArray.hasComponent(collidingEntity)) {
//       const transformComponent = TransformComponentArray.getComponent(arrow);
//       const projectileComponent = ProjectileComponentArray.getComponent(arrow);

//       const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

//       const ammoInfo = AMMO_INFO_RECORD[ItemType.frostcicle];

//       const owner = validateEntity(projectileComponent.creator);
//       const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
      
//       damageEntity(collidingEntity, owner, ammoInfo.damage, DamageSource.arrow, AttackEffectiveness.effective, collisionPoint, 0);
//       applyKnockback(collidingEntity, ammoInfo.knockback, hitDirection);

//       if (StatusEffectComponentArray.hasComponent(collidingEntity) && ammoInfo.statusEffect !== null) {
//          applyStatusEffect(collidingEntity, ammoInfo.statusEffect.type, ammoInfo.statusEffect.durationTicks);
//       }

//       destroyEntity(arrow);
//    }
// }