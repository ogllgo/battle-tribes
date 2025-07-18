import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { OkrenTongueTipComponent } from "../../components/OkrenTongueTipComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { TransformComponent, addHitboxToTransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

export function createOkrenTongueTipConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
      
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), angle, 16, 24), 0.9, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.cactus, [HitboxFlag.KRUMBLID_BODY]);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const physicsComponent = new PhysicsComponent();
   
   const okrenTongueTipComponent = new OkrenTongueTipComponent();
   
   return {
      entityType: EntityType.okrenTongueTip,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.okrenTongueTip]: okrenTongueTipComponent
      },
      lights: []
   };
}