import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType, DamageSource } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, hitEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { getEntityType } from "../../world";
import { TransformComponent } from "../../components/TransformComponent";
import { SpitPoisonAreaComponent } from "../../components/SpitPoisonAreaComponent";
import { createHitbox } from "../../hitboxes";

export function createSpitPoisonAreaConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent(0);
   // @Hack mass
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 55), Number.EPSILON, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const spitPoisonAreaComponent = new SpitPoisonAreaComponent();
   
   return {
      entityType: EntityType.spitPoisonArea,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.spitPoisonArea]: spitPoisonAreaComponent
      },
      lights: []
   }
}

export function onSpitPoisonCollision(spit: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.slime || collidingEntityType === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "spitPoison")) {
      return;
   }

   hitEntity(collidingEntity, spit, 1, DamageSource.poison, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(collidingEntity, "spitPoison", 0.35);

   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 3 * Settings.TPS);
   }
}