import { COLLISION_BITS, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType, TreeSize } from "battletribes-shared/entities";
import { Point, randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { TREE_RADII, TreeComponent, TreeComponentArray } from "../../components/TreeComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.loot
   | ServerComponentType.tree;

const TREE_MAX_HEALTHS = [10, 15];

registerEntityLootOnDeath(EntityType.tree, [
   {
      itemType: ItemType.wood,
      getAmount: (tree: Entity) => {
         const treeComponent = TreeComponentArray.getComponent(tree);
         switch (treeComponent.treeSize) {
            case TreeSize.small: return randInt(2, 4);
            case TreeSize.large: return randInt(5, 7);
         }
      }
   },
   {
      itemType: ItemType.seed,
      getAmount: (tree: Entity) => {
         const treeComponent = TreeComponentArray.getComponent(tree);

         let dropChance: number;
         switch (treeComponent.treeSize) {
            case TreeSize.small: dropChance = 0.25; break;
            case TreeSize.large: dropChance = 0.5; break;
         }

         return Math.random() < dropChance ? 1 : 0;
      }
   }
]);

export function createTreeConfig(): EntityConfig<ComponentTypes> {
   const size: TreeSize = Math.random() > 1/3 ? 1 : 0;
   
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(new CircularBox(null, new Point(0, 0), 0, TREE_RADII[size]), 1.25 + size * 0.25, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   transformComponent.collisionBit = COLLISION_BITS.plants;
   
   const healthComponent = new HealthComponent(TREE_MAX_HEALTHS[size]);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const lootComponent = new LootComponent();
   
   const treeComponent = new TreeComponent(size);
   
   return {
      entityType: EntityType.tree,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.tree]: treeComponent
      },
      lights: []
   };
}