import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { PebblumComponent } from "../../components/PebblumComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { createHitbox } from "../../hitboxes";

export function createPebblumConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent(0);
   
   // Body
   const bodyHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, -4), rotation, 10 * 2), 0.4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(bodyHitbox, null);
   // Nose
   const noseHitbox = createHitbox(transformComponent, bodyHitbox, new CircularBox(new Point(0, 0), new Point(0, 6), 0, 8 * 2), 0.3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(noseHitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(20);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning | StatusEffect.poisoned);
   
   // @Incomplete?
   const pebblumComponent = new PebblumComponent(0);
   
   return {
      entityType: EntityType.pebblum,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.pebblum]: pebblumComponent
      },
      lights: []
   };
}