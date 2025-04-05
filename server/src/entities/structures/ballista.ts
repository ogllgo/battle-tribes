import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Inventory, InventoryName } from "battletribes-shared/items/items";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
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
import { Point } from "../../../../shared/src/utils";
import { createHitbox, Hitbox } from "../../hitboxes";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { StructureConnection } from "../../structure-placement";

const move = () => {
   throw new Error();
}

export function createBallistaConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = new RectangularBox(position, new Point(0, 0), rotation, 100, 100);
   const hitbox = createHitbox(transformComponent, null, box, 2, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(100);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);

   const turretComponent = new TurretComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(transformComponent.children[0] as Hitbox, 550, move);
   
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