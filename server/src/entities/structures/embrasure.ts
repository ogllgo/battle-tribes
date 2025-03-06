import { BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { EntityConfig } from "../../components";
import { destroyEntity, getEntityType } from "../../world";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import { createHitbox } from "../../hitboxes";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { StructureConnection } from "../../structure-placement";

const HEALTHS = [15, 45];

export function createEmbrasureConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent(0);
   
   const VERTICAL_HITBOX_WIDTH = 12;
   const VERTICAL_HITBOX_HEIGHT = 20;
   
   const HORIZONTAL_HITBOX_WIDTH = 24;
   const HORIZONTAL_HITBOX_HEIGHT = 16;

   // Add the two vertical hitboxes (can stop arrows)
   const hitbox1 = createHitbox(transformComponent, null, new RectangularBox(position.copy(), new Point(-(64 - VERTICAL_HITBOX_WIDTH) / 2 + 0.025, 0), rotation, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox1, null);
   const hitbox2 = createHitbox(transformComponent, null, new RectangularBox(position.copy(), new Point((64 - VERTICAL_HITBOX_WIDTH) / 2 - 0.025, 0), rotation, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox2, null);

   // Add the two horizontal hitboxes (cannot stop arrows)
   const hitbox3 = createHitbox(transformComponent, null, new RectangularBox(position.copy(), new Point(-(64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), rotation, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox3, null);
   const hitbox4 = createHitbox(transformComponent, null, new RectangularBox(position.copy(), new Point((64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), rotation, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox4, null);
   
   const healthComponent = new HealthComponent(HEALTHS[material]);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const buildingMaterialComponent = new BuildingMaterialComponent(material, HEALTHS);
   
   return {
      entityType: EntityType.embrasure,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.buildingMaterial]: buildingMaterialComponent
      },
      lights: []
   };
}

export function onEmbrasureCollision(collidingEntity: Entity, pushedHitboxIdx: number): void {
   if (getEntityType(collidingEntity) === EntityType.woodenArrow) {
      // @Incomplete?
      // const arrowComponent = ProjectileComponentArray.getComponent(collidingEntity.id);
      // if (arrowComponent.ignoreFriendlyBuildings) {
      //    return;
      // }

      if (pushedHitboxIdx <= 1) {
         destroyEntity(collidingEntity);
      }
   }
}