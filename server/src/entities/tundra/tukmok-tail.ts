import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point, polarVec2 } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TukmokTailComponent } from "../../components/TukmokTailComponent";
import { createHitbox, Hitbox } from "../../hitboxes";
import { tetherHitboxes } from "../../tethers";

const NUM_SEGMENTS = 25;

export function createTukmokTailConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   let lastHitbox: Hitbox | null = null;
   for (let i = 0; i < NUM_SEGMENTS; i++) {
      let hitboxPosition: Point;
      if (lastHitbox === null) {
         hitboxPosition = position;
      } else {
         hitboxPosition = lastHitbox.box.position.copy();
         hitboxPosition.add(polarVec2(8, angle));
      }
      
      const hitbox = createHitbox(transformComponent, null, new CircularBox(hitboxPosition, new Point(0, 0), angle, 8), 0.05, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (lastHitbox === null) {

      } else {
         tetherHitboxes(hitbox, lastHitbox, transformComponent, transformComponent, 12, 50, 1);
      }

      lastHitbox = hitbox;

      if(1+1===2)break;
   }

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(250);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const tukmokTailComponent = new TukmokTailComponent();
   
   return {
      entityType: EntityType.tukmokTail,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tukmokTail]: tukmokTailComponent
      },
      lights: []
   };
}