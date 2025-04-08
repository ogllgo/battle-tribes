import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { createAIHelperComponentParams } from "../entity-components/server-components/AIHelperComponent";
import { createHealthComponentParams } from "../entity-components/server-components/HealthComponent";
import { createSlingTurretComponentParams } from "../entity-components/server-components/SlingTurretComponent";
import { createStatusEffectComponentParams } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentParams } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentParams } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentParams } from "../entity-components/server-components/TribeComponent";
import { createTurretComponentParams } from "../entity-components/server-components/TurretComponent";
import { createHitbox, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityParams } from "../world";

export function createSlingTurretConfig(position: Point, rotation: number, tribe: Tribe): EntityParams {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const box = new CircularBox(position, new Point(0, 0), rotation, 40);
   const hitbox = createHitbox(hitboxLocalID++, null, box, new Point(0, 0), new Point(0, 0), 1.5, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.slingTurret,
      serverComponentParams: {
         [ServerComponentType.transform]: createTransformComponentParams(hitboxes),
         [ServerComponentType.health]: createHealthComponentParams(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentParams(),
         [ServerComponentType.structure]: createStructureComponentParams(),
         [ServerComponentType.tribe]: createTribeComponentParams(tribe),
         [ServerComponentType.turret]: createTurretComponentParams(),
         [ServerComponentType.aiHelper]: createAIHelperComponentParams(),
         [ServerComponentType.slingTurret]: createSlingTurretComponentParams(),
      },
      clientComponentParams: {}
   };
}