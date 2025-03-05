import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { BoulderComponent } from "../../components/BoulderComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { createHitbox } from "../../hitboxes";

registerEntityLootOnDeath(EntityType.boulder, [
   {
      itemType: ItemType.rock,
      getAmount: () => randInt(5, 7)
   }
]);

export function createBoulderConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 40), 1.25, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(40);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned);
   
   const lootComponent = new LootComponent();
   
   const boulderComponent = new BoulderComponent();
   
   return {
      entityType: EntityType.boulder,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.boulder]: boulderComponent
      },
      lights: []
   };
}