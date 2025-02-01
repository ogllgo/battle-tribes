import { COLLISION_BITS, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { BerryBushComponent } from "../../components/BerryBushComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { EntityConfig } from "../../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.berryBush;

export const BERRY_BUSH_RADIUS = 40;

export function createBerryBushConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, BERRY_BUSH_RADIUS), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addStaticHitbox(hitbox, null);
   transformComponent.collisionBit = COLLISION_BITS.plants;
   
   const healthComponent = new HealthComponent(10);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);
   
   const berryBushComponent = new BerryBushComponent();
   
   return {
      entityType: EntityType.berryBush,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.berryBush]: berryBushComponent
      },
      lights: []
   }
}