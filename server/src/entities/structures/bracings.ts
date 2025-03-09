import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { BuildingMaterial, ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Settings } from "../../../../shared/src/settings";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point } from "../../../../shared/src/utils";
import { createEntityConfig, EntityConfig } from "../../components";
import { BracingsComponent } from "../../components/BracingsComponent";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { createHitbox } from "../../hitboxes";
import Tribe from "../../Tribe";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";

// @Memory
const HEALTHS = [5, 20]; 

export function createBracingsConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox1 = createHitbox(transformComponent, null, new RectangularBox(position.copy(), new Point(0, Settings.TILE_SIZE * -0.5), rotation, 16, 16), 0.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])
   addHitboxToTransformComponent(transformComponent, hitbox1);

   const hitbox2 = createHitbox(transformComponent, null, new RectangularBox(position.copy(), new Point(0, Settings.TILE_SIZE * 0.5), rotation, 16, 16), 0.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])
   addHitboxToTransformComponent(transformComponent, hitbox2);
   
   const healthComponent = new HealthComponent(HEALTHS[material]);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent([], virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const buildingMaterialComponent = new BuildingMaterialComponent(material, HEALTHS);

   const bracingsComponent = new BracingsComponent();
   
   return createEntityConfig(
      EntityType.bracings,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.buildingMaterial]: buildingMaterialComponent,
         [ServerComponentType.bracings]: bracingsComponent
      },
      []
   );
}