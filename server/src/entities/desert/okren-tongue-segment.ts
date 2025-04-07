import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { OkrenTongueSegmentComponent } from "../../components/OkrenTongueSegmentComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { TransformComponent, addHitboxToTransformComponent } from "../../components/TransformComponent";
import { createHitbox } from "../../hitboxes";

export function createOkrenTongueSegmentConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
      
   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), angle, 16, 24), 0.75, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.cactus, [HitboxFlag.KRUMBLID_BODY]);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const physicsComponent = new PhysicsComponent();

   // @HACK! should be on the whole tongue!!
   const healthComponent = new HealthComponent(99);
   
   const okrenTongueSegmentComponent = new OkrenTongueSegmentComponent();
   
   return {
      entityType: EntityType.okrenTongueSegment,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.okrenTongueSegment]: okrenTongueSegmentComponent
      },
      lights: []
   };
}