import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntityConfig, EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import { HealingTotemComponent } from "../../components/HealingTotemComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { createHitbox } from "../../hitboxes";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { StructureConnection } from "../../structure-placement";

export function createHealingTotemConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent(0);

   const box = new CircularBox(position, new Point(0, 0), rotation, 48);
   const hitbox = createHitbox(transformComponent, null, box, 1, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(50);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);

   const tribeComponent = new TribeComponent(tribe);

   const aiHelperComponent = new AIHelperComponent(transformComponent.hitboxes[0], 270);
   
   const healingTotemComponent = new HealingTotemComponent();
   
   return createEntityConfig(
      EntityType.healingTotem,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.healingTotem]: healingTotemComponent
      },
      []
   );
}