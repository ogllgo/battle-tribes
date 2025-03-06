import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntityConfig, EntityConfig } from "../../components";
import Tribe from "../../Tribe";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { PlanterBoxComponent } from "../../components/PlanterBoxComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { createHitbox } from "../../hitboxes";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { StructureConnection } from "../../structure-placement";

export function createPlanterBoxConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent(0);

   const box = new RectangularBox(position, new Point(0, 0), rotation, 80, 80);
   const hitbox = createHitbox(transformComponent, null, box, 1.5, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(15);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const planterBoxComponent = new PlanterBoxComponent();
   
   return createEntityConfig(
      EntityType.planterBox,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.planterBox]: planterBoxComponent
      },
      []
   );
}