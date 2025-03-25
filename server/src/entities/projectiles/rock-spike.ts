import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { RockSpikeComponent } from "../../components/RockSpikeComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { createHitbox } from "../../hitboxes";

// @Memory
const MASSES = [1, 1.75, 2.5];
export const ROCK_SPIKE_HITBOX_SIZES = [12 * 2, 16 * 2, 20 * 2];

export function createRockSpikeConfig(position: Point, rotation: number, size: number, frozenYeti: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, ROCK_SPIKE_HITBOX_SIZES[size]), MASSES[size], HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const rockSpikeComponent = new RockSpikeComponent(size, frozenYeti);
   
   return {
      entityType: EntityType.rockSpikeProjectile,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.rockSpike]: rockSpikeComponent
      },
      lights: []
   };
}