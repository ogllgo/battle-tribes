import { BuildingMaterial, ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { createBracingsComponentParams } from "../entity-components/server-components/BracingsComponent";
import { createBuildingMaterialComponentParams } from "../entity-components/server-components/BuildingMaterialComponent";
import { createHealthComponentParams } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentParams } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentParams } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentParams } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentParams } from "../entity-components/server-components/TribeComponent";
import { Tribe } from "../tribes";
import { EntityParams } from "../world";
import { Point } from "../../../shared/src/utils";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/src/collision";
import { Settings } from "../../../shared/src/settings";
import { createHitboxQuick, Hitbox } from "../hitboxes";

export function createBracingsConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial): EntityParams {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;
   
   const hitbox1 = createHitboxQuick(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(0, Settings.TILE_SIZE * -0.5), rotation, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [])
   hitboxes.push(hitbox1);

   const hitbox2 = createHitboxQuick(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(0, Settings.TILE_SIZE * 0.5), rotation, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [])
   hitboxes.push(hitbox2);
   
   return {
      entityType: EntityType.bracings,
      serverComponentParams: {
         [ServerComponentType.transform]: createTransformComponentParams(hitboxes),
         [ServerComponentType.health]: createHealthComponentParams(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentParams(),
         [ServerComponentType.structure]: createStructureComponentParams(),
         [ServerComponentType.tribe]: createTribeComponentParams(tribe),
         [ServerComponentType.buildingMaterial]: createBuildingMaterialComponentParams(material),
         [ServerComponentType.bracings]: createBracingsComponentParams()
      },
      clientComponentParams: {}
   };
}