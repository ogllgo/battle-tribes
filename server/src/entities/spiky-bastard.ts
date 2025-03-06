import { ServerComponentType } from "battletribes-shared/components";
import { createEntityConfig, EntityConfig } from "../components";
import { Point } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { TransformComponent } from "../components/TransformComponent";
import { HealthComponent } from "../components/HealthComponent";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
import { StatusEffect } from "../../../shared/src/status-effects";
import { SpikyBastardComponent } from "../components/SpikyBastardComponent";
import { createHitbox } from "../hitboxes";
   
export function createSpikyBastardConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 16, 32), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(5);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning);

   const spikyBastardComponent = new SpikyBastardComponent();
   
   return createEntityConfig(
      EntityType.spikyBastard,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.spikyBastard]: spikyBastardComponent
      },
      []
   );
}