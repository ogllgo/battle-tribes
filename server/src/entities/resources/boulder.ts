import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { BoulderComponent } from "../../components/BoulderComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.boulder;

export function createBoulderConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(null, new Point(0, 0), 0, 40), 1.25, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(40);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned);
   
   const boulderComponent = new BoulderComponent();
   
   return {
      entityType: EntityType.boulder,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.boulder]: boulderComponent
      },
      lights: []
   };
}