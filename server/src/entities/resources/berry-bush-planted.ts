import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { StatusEffect } from "battletribes-shared/status-effects";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { PlantedComponent } from "../../components/PlantedComponent";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { BerryBushPlantedComponent, BerryBushPlantedComponentArray } from "../../components/BerryBushPlantedComponent";
import { createHitbox } from "../../hitboxes";
import { registerEntityLootOnHit } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { registerDirtyEntity } from "../../server/player-clients";

registerEntityLootOnHit(EntityType.berryBushPlanted, {
   itemType: ItemType.berry,
   getAmount: (berryBush: Entity) => {
      const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(berryBush);
      return berryBushPlantedComponent.numFruit > 0 ? 1 : 0;
   },
   onItemDrop: (berryBush: Entity) => {
      // @Hack: this type of logic feels like it should be done in a component
      const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(berryBush);
      if (berryBushPlantedComponent.numFruit > 0) {
         berryBushPlantedComponent.numFruit--;
         registerDirtyEntity(berryBush);
      }
   }
});

export function createBerryBushPlantedConfig(position: Point, rotation: number, planterBox: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 28), 0.3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   transformComponent.collisionBit = CollisionBit.plants;

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const plantedComponent = new PlantedComponent(planterBox);

   const berryBushPlantedComponent = new BerryBushPlantedComponent();
   
   return {
      entityType: EntityType.berryBushPlanted,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.planted]: plantedComponent,
         [ServerComponentType.berryBushPlanted]: berryBushPlantedComponent
      },
      lights: []
   };
}