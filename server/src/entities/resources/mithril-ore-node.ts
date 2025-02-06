import { createHitbox, HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { MithrilOreNodeComponent } from "../../components/MithrilOreNodeComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.mithrilOreNode;

export function createMithrilOreNodeConfig(size: number, variant: number, children: ReadonlyArray<Entity>, renderHeight: number): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(new RectangularBox(null, new Point(0, 0), 16, 16, 0), 0.25, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(15);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const mithrilOreNodeComponent = new MithrilOreNodeComponent(size, variant, children, renderHeight);
   
   return {
      entityType: EntityType.mithrilOreNode,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.mithrilOreNode]: mithrilOreNodeComponent
      },
      lights: []
   };
}