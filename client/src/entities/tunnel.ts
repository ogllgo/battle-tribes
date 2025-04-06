import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../shared/src/collision";
import { BuildingMaterial, ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { createBuildingMaterialComponentParams } from "../entity-components/server-components/BuildingMaterialComponent";
import { createHealthComponentParams } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentParams } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentParams } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentParams } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentParams } from "../entity-components/server-components/TribeComponent";
import { createTunnelComponentParams } from "../entity-components/server-components/TunnelComponent";
import { createHitbox, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityParams } from "../world";

export function createTunnelConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial): EntityParams {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const HITBOX_WIDTH = 8;
   const HITBOX_HEIGHT = 64;
   const THIN_HITBOX_WIDTH = 0.1;
   
   // Soft hitboxes
   const soft1 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(-32 + HITBOX_WIDTH / 2, 0), rotation, HITBOX_WIDTH, HITBOX_HEIGHT), new Point(0, 0), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(soft1);
   const soft2 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(32 - HITBOX_WIDTH / 2, 0), rotation, HITBOX_WIDTH, HITBOX_HEIGHT), new Point(0, 0), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(soft2);

   // Hard hitboxes
   const hard1 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(-32.5 + THIN_HITBOX_WIDTH, 0), rotation, THIN_HITBOX_WIDTH, HITBOX_HEIGHT), new Point(0, 0), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hard1);
   const hard2 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(32.5 - THIN_HITBOX_WIDTH, 0), rotation, THIN_HITBOX_WIDTH, HITBOX_HEIGHT), new Point(0, 0), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hard2);

   const box = new RectangularBox(position, new Point(0, 0), rotation, 104, 104);
   const hitbox = createHitbox(hitboxLocalID++, null, box, new Point(0, 0), 2, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.tunnel,
      serverComponentParams: {
         [ServerComponentType.transform]: createTransformComponentParams(hitboxes),
         [ServerComponentType.health]: createHealthComponentParams(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentParams(),
         [ServerComponentType.structure]: createStructureComponentParams(),
         [ServerComponentType.tribe]: createTribeComponentParams(tribe),
         [ServerComponentType.buildingMaterial]: createBuildingMaterialComponentParams(material),
         [ServerComponentType.tunnel]: createTunnelComponentParams()
      },
      clientComponentParams: {}
   };
}