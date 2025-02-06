import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { StructureConnection } from "battletribes-shared/structures";
import { createFenceGateHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
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

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.fenceGate;

export function createFenceGateConfig(tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   transformComponent.addHitboxes(createFenceGateHitboxes(), null);
   
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