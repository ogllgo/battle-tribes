import { HitboxCollisionType, HitboxFlag } from "../../../shared/src/boxes/boxes";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { createHealthComponentParams } from "../entity-components/server-components/HealthComponent";
import { createPunjiSticksComponentParams } from "../entity-components/server-components/PunjiSticksComponent";
import { createSpikesComponentParams } from "../entity-components/server-components/SpikesComponent";
import { createStatusEffectComponentParams } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentParams } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentParams } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentParams } from "../entity-components/server-components/TribeComponent";
import { createHitbox, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityParams } from "../world";

export function createFloorPunjiSticksConfig(position: Point, rotation: number, tribe: Tribe): EntityParams {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 48, 48);
   const hitbox = createHitbox(hitboxLocalID++, null, box, new Point(0, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.floorPunjiSticks,
      serverComponentParams: {
         [ServerComponentType.transform]: createTransformComponentParams(hitboxes),
         [ServerComponentType.health]: createHealthComponentParams(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentParams(),
         [ServerComponentType.structure]: createStructureComponentParams(),
         [ServerComponentType.tribe]: createTribeComponentParams(tribe),
         [ServerComponentType.spikes]: createSpikesComponentParams(),
         [ServerComponentType.punjiSticks]: createPunjiSticksComponentParams()
      },
      clientComponentParams: {}
   };
}

export function createWallPunjiSticksConfig(position: Point, rotation: number, tribe: Tribe): EntityParams {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 56, 32);
   const hitbox = createHitbox(hitboxLocalID++, null, box, new Point(0, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.wallPunjiSticks,
      serverComponentParams: {
         [ServerComponentType.transform]: createTransformComponentParams(hitboxes),
         [ServerComponentType.health]: createHealthComponentParams(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentParams(),
         [ServerComponentType.structure]: createStructureComponentParams(),
         [ServerComponentType.tribe]: createTribeComponentParams(tribe),
         [ServerComponentType.spikes]: createSpikesComponentParams(),
         [ServerComponentType.punjiSticks]: createPunjiSticksComponentParams()
      },
      clientComponentParams: {}
   };
}