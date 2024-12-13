import { createHitbox, HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TreeRootSegmentComponent } from "../../components/TreeRootSegmentComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.treeRootSegment;

export function createTreeRootSegmentConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), 24, 40, 0), 0.75, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(15);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const treeRootSegmentComponent = new TreeRootSegmentComponent();
   
   return {
      entityType: EntityType.treeRootSegment,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.treeRootSegment]: treeRootSegmentComponent
      }
   };
}