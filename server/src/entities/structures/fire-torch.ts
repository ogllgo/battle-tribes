import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { createFireTorchHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import { FireTorchComponent } from "../../components/FireTorchComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { StructureConnection } from "../../../../shared/src/structures";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.fireTorch;

export function createFireTorchConfig(tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   transformComponent.addHitboxes(createFireTorchHitboxes(), null); 
   
   const healthComponent = new HealthComponent(3);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const fireTorchComponent = new FireTorchComponent();
   
   return {
      entityType: EntityType.fireTorch,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.fireTorch]: fireTorchComponent
      },
      lights: []
   };
}