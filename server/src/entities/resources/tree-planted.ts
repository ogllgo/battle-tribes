import { COLLISION_BITS, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point, randInt } from "battletribes-shared/utils";
import { StatusEffect } from "battletribes-shared/status-effects";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { PlantedComponent } from "../../components/PlantedComponent";
import { plantedTreeIsFullyGrown, TreePlantedComponent } from "../../components/TreePlantedComponent";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
   
type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.planted
   | ServerComponentType.loot
   | ServerComponentType.treePlanted;

registerEntityLootOnDeath(EntityType.treePlanted, [
   {
      itemType: ItemType.wood,
      getAmount: (entity: Entity) => {
         return plantedTreeIsFullyGrown(entity) ? randInt(2, 4) : 0;
      }
   },
   {
      itemType: ItemType.seed,
      getAmount: (entity: Entity) => {
         return plantedTreeIsFullyGrown(entity) ? 1 : 0;
      }
   }
]);

export function createTreePlantedConfig(planterBox: Entity): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(new CircularBox(null, new Point(0, 0), 0, 28), 0.3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   transformComponent.collisionBit = COLLISION_BITS.plants;

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const plantedComponent = new PlantedComponent(planterBox);

   const lootComponent = new LootComponent();
   
   const treePlantedComponent = new TreePlantedComponent();
   
   return {
      entityType: EntityType.treePlanted,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.planted]: plantedComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.treePlanted]: treePlantedComponent
      },
      lights: []
   };
}