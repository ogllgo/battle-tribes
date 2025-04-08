import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { CraftingStation } from "../../../shared/src/items/crafting-recipes";
import { Point } from "../../../shared/src/utils";
import { createCraftingStationComponentParams } from "../entity-components/server-components/CraftingStationComponent";
import { createHealthComponentParams } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentParams } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentParams } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentParams } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentParams } from "../entity-components/server-components/TribeComponent";
import { createHitbox, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityParams } from "../world";

export function createWorkbenchConfig(position: Point, rotation: number, tribe: Tribe): EntityParams {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;
   
   // @TEMPORARY: So that the structure placement works for placing workbenches in the corner of walls
   const hitbox = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(0, 0), rotation, 80, 80), new Point(0, 0), new Point(0, 0), 1.6, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   // const hitbox1 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(0, 0), rotation, 72, 80), new Point(0, 0), 1.6, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   // hitboxes.push(hitbox1);
   // const hitbox2 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(0, 0), rotation, 80, 72), new Point(0, 0), 1.6, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   // hitboxes.push(hitbox2);
   
   return {
      entityType: EntityType.workbench,
      serverComponentParams: {
         [ServerComponentType.transform]: createTransformComponentParams(hitboxes),
         [ServerComponentType.health]: createHealthComponentParams(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentParams(),
         [ServerComponentType.structure]: createStructureComponentParams(),
         [ServerComponentType.tribe]: createTribeComponentParams(tribe),
         [ServerComponentType.craftingStation]: createCraftingStationComponentParams(CraftingStation.workbench)
      },
      clientComponentParams: {}
   };
}