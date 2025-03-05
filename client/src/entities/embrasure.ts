import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "../../../shared/src/collision";
import { BuildingMaterial, ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { createBuildingMaterialComponentParams } from "../entity-components/server-components/BuildingMaterialComponent";
import { createHealthComponentParams } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentParams } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentParams } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentParams } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentParams } from "../entity-components/server-components/TribeComponent";
import { createHitbox, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityParams } from "../world";

export function createEmbrasureConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial): EntityParams {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;
   
   const VERTICAL_HITBOX_WIDTH = 12;
   const VERTICAL_HITBOX_HEIGHT = 20;
   
   const HORIZONTAL_HITBOX_WIDTH = 24;
   const HORIZONTAL_HITBOX_HEIGHT = 16;

   // Add the two vertical hitboxes (can stop arrows)
   const hitbox1 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(-(64 - VERTICAL_HITBOX_WIDTH) / 2 + 0.025, 0), rotation, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT), new Point(0, 0), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   hitboxes.push(hitbox1);
   const hitbox2 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point((64 - VERTICAL_HITBOX_WIDTH) / 2 - 0.025, 0), rotation, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT), new Point(0, 0), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   hitboxes.push(hitbox2);

   // Add the two horizontal hitboxes (cannot stop arrows)
   const hitbox3 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(-(64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), rotation, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT), new Point(0, 0), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK, []);
   hitboxes.push(hitbox3);
   const hitbox4 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point((64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), rotation, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT), new Point(0, 0), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK, []);
   hitboxes.push(hitbox4);

   return {
      entityType: EntityType.embrasure,
      serverComponentParams: {
         [ServerComponentType.transform]: createTransformComponentParams(hitboxes),
         [ServerComponentType.health]: createHealthComponentParams(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentParams(),
         [ServerComponentType.structure]: createStructureComponentParams(),
         [ServerComponentType.tribe]: createTribeComponentParams(tribe),
         [ServerComponentType.buildingMaterial]: createBuildingMaterialComponentParams(material)
      },
      clientComponentParams: {}
   };
}