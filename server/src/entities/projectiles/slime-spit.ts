import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { SlimeSpitComponent } from "../../components/SlimeSpitComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { EntityConfig } from "../../components";
import { ServerComponentType } from "battletribes-shared/components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { createHitbox } from "../../hitboxes";

export function createSlimeSpitConfig(position: Point, rotation: number, size: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitboxSize = size === 0 ? 20 : 30;
   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, hitboxSize, hitboxSize), 0.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const physicsComponent = new PhysicsComponent();
   
   const slimeSpitComponent = new SlimeSpitComponent(size);
   
   return {
      entityType: EntityType.slimeSpit,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.slimeSpit]: slimeSpitComponent
      },
      lights: []
   };
}