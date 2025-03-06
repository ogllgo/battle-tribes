import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Point, randInt } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TreeRootBaseComponent } from "../../components/TreeRootBaseComponent";
import { createHitbox } from "../../hitboxes";
   
registerEntityLootOnDeath(EntityType.treeRootBase, [
   {
      itemType: ItemType.wood,
      getAmount: () => randInt(2, 3)
   }
]);

export function createTreeRootBaseConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent(0);

   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 17), 1.25, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(15);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const lootComponent = new LootComponent();
   
   const treeRootBaseComponent = new TreeRootBaseComponent();
   
   return {
      entityType: EntityType.treeRootBase,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.treeRootBase]: treeRootBaseComponent
      },
      lights: []
   };
}