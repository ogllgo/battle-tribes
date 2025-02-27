import { createHitbox, HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Point, randInt } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TreeRootSegmentComponent } from "../../components/TreeRootSegmentComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.loot
   | ServerComponentType.treeRootSegment;

registerEntityLootOnDeath(EntityType.treeRootSegment, [
   {
      itemType: ItemType.wood,
      getAmount: () => randInt(1, 2)
   }
]);
   
export function createTreeRootSegmentConfig(root: Entity): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(new RectangularBox(null, new Point(0, 0), 24, 40, 0), 0.75, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const lootComponent = new LootComponent();
   
   const treeRootSegmentComponent = new TreeRootSegmentComponent(root);
   
   return {
      entityType: EntityType.treeRootSegment,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.treeRootSegment]: treeRootSegmentComponent
      },
      lights: []
   };
}