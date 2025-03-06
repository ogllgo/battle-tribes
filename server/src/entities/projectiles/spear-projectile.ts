import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType, DamageSource } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, hitEntity } from "../../components/HealthComponent";
import { ThrowingProjectileComponent, ThrowingProjectileComponentArray } from "../../components/ThrowingProjectileComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { destroyEntity, entityExists } from "../../world";
import { SpearProjectileComponent } from "../../components/SpearProjectileComponent";
import { createHitbox } from "../../hitboxes";

export function createSpearProjectileConfig(position: Point, rotation: number, tribeMember: Entity, itemID: number | null): EntityConfig {
   const transformComponent = new TransformComponent(0);

   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 12, 60), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByGroundFriction = false;
   
   const throwingProjectileComponent = new ThrowingProjectileComponent(tribeMember, itemID);
   
   const spearProjectileComponent = new SpearProjectileComponent();
   
   return {
      entityType: EntityType.spearProjectile,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.throwingProjectile]: throwingProjectileComponent,
         [ServerComponentType.spearProjectile]: spearProjectileComponent
      },
      lights: []
   };
}

// export function onSpearProjectileCollision(spear: Entity, collidingEntity: Entity, collisionPoint: Point): void {
//    // Don't hurt friendlies
//    const spearComponent = ThrowingProjectileComponentArray.getComponent(spear);
//    if (entityExists(spearComponent.tribeMember) && getEntityRelationship(spearComponent.tribeMember, collidingEntity) === EntityRelationship.friendly) {
//       return;
//    }
   
//    if (!HealthComponentArray.hasComponent(collidingEntity)) {
//       return;
//    }

//    const tribeMember = entityExists(spearComponent.tribeMember) ? spearComponent.tribeMember : null;

//    const spearTransformComponent = TransformComponentArray.getComponent(spear);

//    let vx = spearTransformComponent.selfVelocity.x + spearTransformComponent.externalVelocity.x;
//    let vy = spearTransformComponent.selfVelocity.y + spearTransformComponent.externalVelocity.y;
//    if (tribeMember !== null) {
//       const tribeMemberTransformComponent = TransformComponentArray.getComponent(tribeMember);
//       vx -= tribeMemberTransformComponent.selfVelocity.x + tribeMemberTransformComponent.externalVelocity.x;
//       vy -= tribeMemberTransformComponent.selfVelocity.y + tribeMemberTransformComponent.externalVelocity.y;
//    }
   
//    const spearVelocityMagnitude = Math.sqrt(vx * vx + vy * vy);
//    const damage = Math.floor(spearVelocityMagnitude / 140);
   
//    const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   
//    // Damage the entity
//    // @Temporary
//    const hitDirection = spearTransformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
//    damageEntity(collidingEntity, tribeMember, damage, DamageSource.spear, AttackEffectiveness.effective, collisionPoint, 0);
//    applyKnockback(collidingEntity, 200, hitDirection);
   
//    destroyEntity(spear);
// }