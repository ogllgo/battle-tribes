import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { createAIHelperComponentParams } from "../entity-components/server-components/AIHelperComponent";
import { createHealthComponentParams } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentParams } from "../entity-components/server-components/StatusEffectComponent";
import { createTransformComponentParams } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentParams } from "../entity-components/server-components/TribeComponent";
import { createTribeMemberComponentParams } from "../entity-components/server-components/TribeMemberComponent";
import { createTribesmanAIComponentParams } from "../entity-components/server-components/TribesmanAIComponent";
import { createHitbox, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityParams } from "../world";

export function createScrappyConfig(position: Point, rotation: number, tribe: Tribe): EntityParams {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const hitbox = createHitbox(hitboxLocalID++, null, new CircularBox(position, new Point(0, 0), rotation, 20), new Point(0, 0), new Point(0, 0), 0.75, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.scrappy,
      serverComponentParams: {
         [ServerComponentType.transform]: createTransformComponentParams(hitboxes),
         [ServerComponentType.health]: createHealthComponentParams(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentParams(),
         [ServerComponentType.tribe]: createTribeComponentParams(tribe),
         [ServerComponentType.tribeMember]: createTribeMemberComponentParams(),
         [ServerComponentType.tribesmanAI]: createTribesmanAIComponentParams(),
         [ServerComponentType.aiHelper]: createAIHelperComponentParams(),
      },
      clientComponentParams: {}
   };
}