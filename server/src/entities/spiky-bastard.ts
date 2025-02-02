import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { Point } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { TransformComponent } from "../components/TransformComponent";
import { HealthComponent } from "../components/HealthComponent";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
import { StatusEffect } from "../../../shared/src/status-effects";
import { SpikyBastardComponent } from "../components/SpikyBastardComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.spikyBastard;
   
export function createSpikyBastardConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new RectangularBox(null, new Point(0, 0), 16, 32, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(5);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning);

   const spikyBastardComponent = new SpikyBastardComponent();
   
   return {
      entityType: EntityType.spikyBastard,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.spikyBastard]: spikyBastardComponent
      },
      lights: []
   };
}