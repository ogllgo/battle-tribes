import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import Tribe from "../../Tribe";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { FenceGateComponent } from "../../components/FenceGateComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { createHitbox } from "../../hitboxes";
import { StructureConnection } from "../../structure-placement";

export function createFenceGateConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent(0);
   
   const box = new RectangularBox(position, new Point(0, 0), rotation, 56, 16);
   const hitbox = createHitbox(transformComponent, null, box, 1, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(5);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const fenceGateComponent = new FenceGateComponent();
   
   return {
      entityType: EntityType.fenceGate,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.fenceGate]: fenceGateComponent
      },
      lights: []
   };
}