import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { createAIHelperComponentParams } from "../entity-components/server-components/AIHelperComponent";
import { createAmmoBoxComponentParams } from "../entity-components/server-components/AmmoBoxComponent";
import { createBallistaComponentParams } from "../entity-components/server-components/BallistaComponent";
import { createHealthComponentParams } from "../entity-components/server-components/HealthComponent";
import { createInventoryComponentParams } from "../entity-components/server-components/InventoryComponent";
import { createStatusEffectComponentParams } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentParams } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentParams } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentParams } from "../entity-components/server-components/TribeComponent";
import { createTurretComponentParams } from "../entity-components/server-components/TurretComponent";
import { Hitbox, createHitboxQuick } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityParams } from "../world";

export function createBallistaConfig(position: Point, rotation: number, tribe: Tribe): EntityParams {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 100, 100);
   const hitbox = createHitboxQuick(hitboxLocalID++, null, box, 2, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.ballista,
      serverComponentParams: {
         [ServerComponentType.transform]: createTransformComponentParams(hitboxes),
         [ServerComponentType.health]: createHealthComponentParams(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentParams(),
         [ServerComponentType.structure]: createStructureComponentParams(),
         [ServerComponentType.tribe]: createTribeComponentParams(tribe),
         [ServerComponentType.turret]: createTurretComponentParams(),
         [ServerComponentType.aiHelper]: createAIHelperComponentParams(),
         [ServerComponentType.ammoBox]: createAmmoBoxComponentParams(),
         [ServerComponentType.inventory]: createInventoryComponentParams(),
         [ServerComponentType.ballista]: createBallistaComponentParams()
      },
      clientComponentParams: {}
   };
}