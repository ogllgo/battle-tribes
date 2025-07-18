import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
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
import { TukmokTrunkComponent } from "../../components/TukmokTrunkComponent";
import { createHitbox, Hitbox } from "../../hitboxes";
import { tetherHitboxes } from "../../tethers";

const NUM_SEGMENTS = 8;

const IDEAL_DIST = 6;

export function createTukmokTrunkConfig(position: Point, angle: number, trunkBaseOffset: Point, tukmokHeadHitbox: Hitbox): EntityConfig {
   const transformComponent = new TransformComponent();

   let lastHitbox: Hitbox | null = null;
   for (let i = 0; i < NUM_SEGMENTS; i++) {
      let hitboxPosition: Point;
      let parent: Hitbox | null;
      let offset: Point;
      if (lastHitbox === null) {
         hitboxPosition = position;
         parent = tukmokHeadHitbox;
         offset = trunkBaseOffset;
      } else {
         hitboxPosition = lastHitbox.box.position.copy();
         hitboxPosition.add(polarVec2(IDEAL_DIST, angle));
         parent = null;
         offset = new Point(0, 0);
      }

      let mass: number;
      let flags: Array<HitboxFlag>;
      if (i < NUM_SEGMENTS - 1) {
         mass = 0.25;
         flags = [];
      } else {
         mass = 0.35;
         flags = [HitboxFlag.TUKMOK_TRUNK_HEAD];
      }

      const hitbox = createHitbox(transformComponent, parent, new CircularBox(hitboxPosition, offset, 0, 12), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, flags);
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (lastHitbox !== null) {
         tetherHitboxes(hitbox, lastHitbox, transformComponent, transformComponent, IDEAL_DIST, 25, 0.5);
         // @Hack: method of adding
         hitbox.angularTethers.push({
            originHitbox: lastHitbox,
            idealAngle: 0,
            springConstant: 25,
            damping: 0.5,
            padding: Math.PI * 0.1,
            idealHitboxAngleOffset: 0
         });
      }

      lastHitbox = hitbox;
   }
   
   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(75);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const tukmokTrunkComponent = new TukmokTrunkComponent();
   
   return {
      entityType: EntityType.tukmokTrunk,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tukmokTrunk]: tukmokTrunkComponent
      },
      lights: []
   };
}