import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { TransformComponent } from "../components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntityConfig, EntityConfig } from "../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { HealthComponent } from "../components/HealthComponent";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
import { TombstoneComponent } from "../components/TombstoneComponent";
import { createHitbox } from "../hitboxes";

export function createTombstoneConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent(0);
   
   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 48, 88), 1.25, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(50);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned);
   
   const tombstoneComponent = new TombstoneComponent();
   
   return createEntityConfig(
      EntityType.tombstone,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tombstone]: tombstoneComponent
      },
      []
   );
}