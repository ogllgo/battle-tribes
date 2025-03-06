import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Point } from "../../../../shared/src/utils";
import { createEntityConfig, EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { MithrilOreNodeComponent } from "../../components/MithrilOreNodeComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { createHitbox } from "../../hitboxes";

registerEntityLootOnDeath(EntityType.mithrilOreNode, [
   {
      itemType: ItemType.mithrilOre,
      getAmount: () => 1
   }
]);

export function createMithrilOreNodeConfig(position: Point, rotation: number, size: number, variant: number, children: ReadonlyArray<Entity>, renderHeight: number): EntityConfig {
   const transformComponent = new TransformComponent(0);

   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 16, 16), 0.25, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(15);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const lootComponent = new LootComponent();
   
   const mithrilOreNodeComponent = new MithrilOreNodeComponent(size, variant, children, renderHeight);
   
   return createEntityConfig(
      EntityType.mithrilOreNode,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.mithrilOreNode]: mithrilOreNodeComponent
      },
      []
   );
}