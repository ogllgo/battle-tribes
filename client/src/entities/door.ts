import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "../../../shared/src/collision";
import { BuildingMaterial, ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { createBuildingMaterialComponentParams } from "../entity-components/server-components/BuildingMaterialComponent";
import { createDoorComponentParams } from "../entity-components/server-components/DoorComponent";
import { createHealthComponentParams } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentParams } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentParams } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentParams } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentParams } from "../entity-components/server-components/TribeComponent";
import { createHitbox, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityParams } from "../world";

export function createDoorConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial): EntityParams {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 64, 16);
   const hitbox = createHitbox(hitboxLocalID++, null, box, new Point(0, 0), 0.5, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.door,
      serverComponentParams: {
         [ServerComponentType.transform]: createTransformComponentParams(hitboxes),
         [ServerComponentType.health]: createHealthComponentParams(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentParams(),
         [ServerComponentType.structure]: createStructureComponentParams(),
         [ServerComponentType.tribe]: createTribeComponentParams(tribe),
         [ServerComponentType.buildingMaterial]: createBuildingMaterialComponentParams(material),
         [ServerComponentType.door]: createDoorComponentParams()
      },
      clientComponentParams: {}
   };
}