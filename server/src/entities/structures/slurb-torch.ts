import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { StructureConnection } from "battletribes-shared/structures";
import { createFireTorchHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { EntityConfig, LightCreationInfo } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import { SlurbTorchComponent } from "../../components/SlurbTorchComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { createLight } from "../../light-levels";
import { Point } from "../../../../shared/src/utils";
import { ITEM_TRAITS_RECORD, ItemType } from "../../../../shared/src/items/items";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.slurbTorch;

export function createSlurbTorchConfig(tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig<ComponentTypes> {
   const hitboxes = createFireTorchHitboxes();
   
   const transformComponent = new TransformComponent();
   transformComponent.addStaticHitboxes(hitboxes, null); 
   
   const healthComponent = new HealthComponent(3);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const slurbTorchComponent = new SlurbTorchComponent();
   
   const torchTrait = ITEM_TRAITS_RECORD[ItemType.slurbTorch].torch!;
   const light = createLight(new Point(0, 0), torchTrait.lightIntensity, torchTrait.lightStrength, torchTrait.lightRadius, torchTrait.lightR, torchTrait.lightG, torchTrait.lightB);
   const lightCreationInfo: LightCreationInfo = {
      light: light,
      attachedHitbox: hitboxes[0]
   }
   
   return {
      entityType: EntityType.slurbTorch,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.slurbTorch]: slurbTorchComponent
      },
      lights: [lightCreationInfo]
   };
}