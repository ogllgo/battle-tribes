import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { createEntityConfig, EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { IceShardComponent } from "../../components/IceShardComponent";
import { createHitbox } from "../../hitboxes";

export function createIceShardConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent(0);
   transformComponent.collisionMask = DEFAULT_COLLISION_MASK & ~COLLISION_BITS.planterBox;

   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 24, 24), 0.4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByGroundFriction = false;

   const iceShardComponent = new IceShardComponent();
   
   return createEntityConfig(
      EntityType.iceShardProjectile,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.iceShard]: iceShardComponent
      },
      []
   );
}