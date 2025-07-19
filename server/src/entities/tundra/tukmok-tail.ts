import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { lerp, Point, polarVec2 } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TukmokTailComponent } from "../../components/TukmokTailComponent";
import { Hitbox } from "../../hitboxes";
import { tetherHitboxes } from "../../tethers";

const NUM_SEGMENTS = 12;

const IDEAL_DIST = 5;

export function createTukmokTailConfig(position: Point, angle: number, tailBaseOffset: Point): EntityConfig {
   const transformComponent = new TransformComponent();

   let lastHitbox: Hitbox | null = null;
   for (let i = 0; i < NUM_SEGMENTS; i++) {
      let hitboxPosition: Point;
      let offset: Point;
      if (lastHitbox === null) {
         hitboxPosition = position;
         offset = tailBaseOffset;
      } else {
         hitboxPosition = lastHitbox.box.position.copy();
         hitboxPosition.add(polarVec2(IDEAL_DIST, angle));
         offset = new Point(0, 0);
      }

      let radius: number;
      let mass: number;
      let flags: Array<HitboxFlag>;
      if (i <= (NUM_SEGMENTS - 1) / 3) {
         radius = 12;
         mass = 0.1;
         flags = [HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_BIG];
      } else if (i <= (NUM_SEGMENTS - 1) / 3 * 2) {
         radius = 10;
         mass = 0.075;
         flags = [HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_MEDIUM];
      } else if (i < NUM_SEGMENTS - 1) {
         radius = 8;
         mass = 0.05;
         flags = [HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_SMALL];
      } else {
         radius = 18;
         mass = 0.28;
         flags = [HitboxFlag.TUKMOK_TAIL_CLUB];
      }
      
      const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(hitboxPosition, offset, 0, radius), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, flags);
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (lastHitbox !== null) {
         tetherHitboxes(hitbox, lastHitbox, IDEAL_DIST, 25, 0.5);

         // @Hack: method of adding
         hitbox.angularTethers.push({
            originHitbox: lastHitbox,
            idealAngle: Math.PI,
            springConstant: 25,
            damping: 0.5,
            // start off stiff, get softer the further we go
            padding: lerp(Math.PI * 0.025, Math.PI * 0.08, i / (NUM_SEGMENTS - 1)),
            idealHitboxAngleOffset: Math.PI
         });
      }

      lastHitbox = hitbox;
   }

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(75);
   
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