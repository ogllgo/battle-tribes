import { createHitbox, HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TreeRootBaseComponent } from "../../components/TreeRootBaseComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.treeRootBase;

export function createTreeRootBaseConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 17), 1.25, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(15);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const treeRootBaseComponent = new TreeRootBaseComponent();
   
   return {
      entityType: EntityType.treeRootBase,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.treeRootBase]: treeRootBaseComponent
      }
   };
}