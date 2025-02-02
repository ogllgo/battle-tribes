import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { createBarrelHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { Inventory, InventoryName } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { addInventoryToInventoryComponent, InventoryComponent } from "../../components/InventoryComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import { BarrelComponent } from "../../components/BarrelComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { StructureConnection } from "../../../../shared/src/structures";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.inventory
   | ServerComponentType.barrel;

export function createBarrelConfig(tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createBarrelHitboxes(), null);
   
   const healthComponent = new HealthComponent(20);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const inventoryComponent = new InventoryComponent();

   const inventory = new Inventory(3, 3, InventoryName.inventory);
   addInventoryToInventoryComponent(inventoryComponent, inventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   
   const barrelComponent = new BarrelComponent();
   
   return {
      entityType: EntityType.barrel,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.barrel]: barrelComponent
      },
      lights: []
   };
}