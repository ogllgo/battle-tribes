import { COLLISION_BITS, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { BerryBushComponent, BerryBushComponentArray } from "../../components/BerryBushComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { EntityConfig } from "../../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { LootComponent, registerEntityLootOnHit } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.loot
   | ServerComponentType.berryBush;

registerEntityLootOnHit(EntityType.berryBush, [
   {
      itemType: ItemType.berry,
      getAmount: (berryBush: Entity) => {
         const berryBushComponent = BerryBushComponentArray.getComponent(berryBush);
         return berryBushComponent.numBerries > 0 ? 1 : 0;
      }
   }
]);

export function createBerryBushConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(new CircularBox(null, new Point(0, 0), 0, 40), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   transformComponent.collisionBit = COLLISION_BITS.plants;
   
   const healthComponent = new HealthComponent(10);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);
   
   const lootComponent = new LootComponent();
   
   const berryBushComponent = new BerryBushComponent();
   
   return {
      entityType: EntityType.berryBush,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.berryBush]: berryBushComponent
      },
      lights: []
   }
}