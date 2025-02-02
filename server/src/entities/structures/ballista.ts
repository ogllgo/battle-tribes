import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { createBallistaHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { Inventory, InventoryName } from "battletribes-shared/items/items";
import { EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import { TurretComponent } from "../../components/TurretComponent";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { AmmoBoxComponent } from "../../components/AmmoBoxComponent";
import { addInventoryToInventoryComponent, InventoryComponent } from "../../components/InventoryComponent";
import { BallistaComponent } from "../../components/BallistaComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { StructureConnection } from "../../../../shared/src/structures";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.turret
   | ServerComponentType.aiHelper
   | ServerComponentType.ammoBox
   | ServerComponentType.inventory
   | ServerComponentType.ballista;

export function createBallistaConfig(tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createBallistaHitboxes(), null);
   
   const healthComponent = new HealthComponent(100);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);

   const turretComponent = new TurretComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(550);
   
   const ammoBoxComponent = new AmmoBoxComponent();

   const inventoryComponent = new InventoryComponent();

   const ammoBoxInventory = new Inventory(3, 1, InventoryName.ammoBoxInventory);
   addInventoryToInventoryComponent(inventoryComponent, ammoBoxInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });

   const ballistaComponent = new BallistaComponent();
   
   return {
      entityType: EntityType.ballista,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.turret]: turretComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.ammoBox]: ammoBoxComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.ballista]: ballistaComponent
      },
      lights: []
   };
}