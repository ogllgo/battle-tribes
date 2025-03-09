import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { createEntityConfig, EntityConfig } from "../../components";
import { GuardianSpikyBallComponent } from "../../components/GuardianSpikyBallComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { createHitbox } from "../../hitboxes";

export function createGuardianSpikyBallConfig(position: Point, rotation: number,creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 20), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByAirFriction = false;
   physicsComponent.isAffectedByGroundFriction = false;
   physicsComponent.isImmovable = true;
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned | StatusEffect.poisoned);
   
   const healthComponent = new HealthComponent(8);
   
   const projectileComponent = new ProjectileComponent(creator);
   
   const guardianSpikyBallComponent = new GuardianSpikyBallComponent();
   
   return createEntityConfig(
      EntityType.guardianSpikyBall,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.projectile]: projectileComponent,
         [ServerComponentType.guardianSpikyBall]: guardianSpikyBallComponent
      },
      []
   );
}