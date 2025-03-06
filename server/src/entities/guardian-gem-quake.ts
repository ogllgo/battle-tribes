import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { createEntityConfig, EntityConfig } from "../components";
import { GuardianGemQuakeComponent } from "../components/GuardianGemQuakeComponent";
import { PhysicsComponent } from "../components/PhysicsComponent";
import { TransformComponent } from "../components/TransformComponent";
import { createHitbox } from "../hitboxes";

export function createGuardianGemQuakeConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 10), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   // @Hack: shouldn't have
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isImmovable = true;

   const guardianGemQuakeComponent = new GuardianGemQuakeComponent();
   
   return createEntityConfig(
      EntityType.guardianGemQuake,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.guardianGemQuake]: guardianGemQuakeComponent
      },
      []
   );
}