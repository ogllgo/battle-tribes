import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { RockSpikeComponent } from "../../components/RockSpikeComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.rockSpike;

const MASSES = [1, 1.75, 2.5];
export const ROCK_SPIKE_HITBOX_SIZES = [12 * 2, 16 * 2, 20 * 2];

export function createRockSpikeConfig(size: number, frozenYeti: Entity): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, ROCK_SPIKE_HITBOX_SIZES[size]), MASSES[size], HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const rockSpikeComponent = new RockSpikeComponent(size, frozenYeti);
   
   return {
      entityType: EntityType.rockSpikeProjectile,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.rockSpike]: rockSpikeComponent
      }
   };
}