import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { SnowballSize, EntityType, Entity, SNOWBALL_SIZES } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponent } from "../components/HealthComponent";
import { SnowballComponent } from "../components/SnowballComponent";
import { PhysicsComponent } from "../components/PhysicsComponent";
import { EntityConfig } from "../components";
import { ServerComponentType } from "battletribes-shared/components";
import { TransformComponent } from "../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
   
type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.snowball;

const MAX_HEALTHS: ReadonlyArray<number> = [1, 3];

export function createSnowballConfig(yeti: Entity, size: SnowballSize): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, SNOWBALL_SIZES[size] / 2), size === SnowballSize.small ? 1 : 1.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addStaticHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(MAX_HEALTHS[size]);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.freezing);
   
   const snowballComponent = new SnowballComponent(yeti, size);
   
   return {
      entityType: EntityType.snowball,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.snowball]: snowballComponent
      },
      lights: []
   };
}