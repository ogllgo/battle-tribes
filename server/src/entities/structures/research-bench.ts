import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { createResearchBenchHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { ResearchBenchComponent } from "../../components/ResearchBenchComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { StructureConnection } from "../../../../shared/src/structures";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.researchBench;

export function createResearchBenchConfig(tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addStaticHitboxes(createResearchBenchHitboxes(), null);
   
   const healthComponent = new HealthComponent(40);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);

   const researchBenchComponent = new ResearchBenchComponent();
   
   return {
      entityType: EntityType.researchBench,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.researchBench]: researchBenchComponent
      },
      lights: []
   };
}