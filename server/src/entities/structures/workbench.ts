import { EntityType } from "battletribes-shared/entities";
import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntityConfig, EntityConfig } from "../../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { CraftingStationComponent } from "../../components/CraftingStationComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { createHitbox } from "../../hitboxes";
import { StructureConnection } from "../../structure-placement";

export function createWorkbenchConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   // @TEMPORARY: So that the structure placement works for placing workbenches in the corner of walls
   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position.copy(), new Point(0, 0), rotation, 80, 80), 1.6, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   // const hitbox1 = createHitbox(transformComponent, null, new RectangularBox(position.copy(), new Point(0, 0), rotation, 72, 80), 1.6, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   // addHitboxToTransformComponent(transformComponent, hitbox1);
   
   // const hitbox2 = createHitbox(transformComponent, null, new RectangularBox(position.copy(), new Point(0, 0), rotation, 80, 72), 1.6, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   // addHitboxToTransformComponent(transformComponent, hitbox2);
   
   const healthComponent = new HealthComponent(15);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);

   const tribeComponent = new TribeComponent(tribe);
   
   const craftingStationComponent = new CraftingStationComponent(CraftingStation.workbench);
   
   return createEntityConfig(
      EntityType.workbench,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.craftingStation]: craftingStationComponent
      },
      []
   );
}