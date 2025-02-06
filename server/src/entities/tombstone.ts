import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { TransformComponent } from "../components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { HealthComponent } from "../components/HealthComponent";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
import { TombstoneComponent } from "../components/TombstoneComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tombstone;
   
const WIDTH = 48;
const HEIGHT = 88;

export function createTombstoneConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(new RectangularBox(null, new Point(0, 0), WIDTH, HEIGHT, 0), 1.25, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(50);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned);
   
   const tombstoneComponent = new TombstoneComponent();
   
   return {
      entityType: EntityType.tombstone,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tombstone]: tombstoneComponent
      },
      lights: []
   };
}