import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { createAIHelperComponentParams } from "../entity-components/server-components/AIHelperComponent";
import { createHealingTotemComponentParams } from "../entity-components/server-components/HealingTotemComponent";
import { createHealthComponentParams } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentParams } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentParams } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentParams } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentParams } from "../entity-components/server-components/TribeComponent";
import { createHitbox, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityParams } from "../world";

export function createHealingTotemConfig(position: Point, rotation: number, tribe: Tribe): EntityParams {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const box = new CircularBox(position, new Point(0, 0), rotation, 48);
   const hitbox = createHitbox(hitboxLocalID++, null, box, new Point(0, 0), new Point(0, 0), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.healingTotem,
      serverComponentParams: {
         [ServerComponentType.transform]: createTransformComponentParams(hitboxes),
         [ServerComponentType.health]: createHealthComponentParams(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentParams(),
         [ServerComponentType.structure]: createStructureComponentParams(),
         [ServerComponentType.tribe]: createTribeComponentParams(tribe),
         [ServerComponentType.aiHelper]: createAIHelperComponentParams(),
         [ServerComponentType.healingTotem]: createHealingTotemComponentParams()
      },
      clientComponentParams: {}
   };
}