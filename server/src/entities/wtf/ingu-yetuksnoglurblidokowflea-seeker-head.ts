import { createNormalisedPivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { HitboxFlag, HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point, polarVec2 } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { InguYetuksnoglurblidokowfleaSeekerHeadComponent } from "../../components/InguYetuksnoglurblidokowfleaSeekerHeadComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";
import { tetherHitboxes } from "../../tethers";

export function createInguYetuksnoglurblidokowfleaSeekerHeadConfig(position: Point, angle: number, baseOffset: Point): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const NUM_SEGMENTS = 30;
   const IDEAL_DIST = 6;
   let lastHitbox: Hitbox | null = null;
   for (let i = 0; i < NUM_SEGMENTS; i++) {
      let hitboxPosition: Point;
      let offset: Point;
      if (lastHitbox === null) {
         hitboxPosition = position;
         offset = baseOffset;
      } else {
         hitboxPosition = lastHitbox.box.position.copy();
         hitboxPosition.add(polarVec2(IDEAL_DIST, angle));
         offset = new Point(0, 0);
      }

      let mass: number;
      let flags: Array<HitboxFlag>;
      if (i < NUM_SEGMENTS - 1) {
         mass = 0.2;
         flags = [HitboxFlag.YETUK_TRUNK_MIDDLE];
      } else {
         mass = 0.3;
         flags = [HitboxFlag.YETUK_TRUNK_HEAD];
      }

      const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(hitboxPosition, offset, 0, 12), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, flags);
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (lastHitbox !== null) {
         tetherHitboxes(hitbox, lastHitbox, IDEAL_DIST, 50, 0.5);
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

   const offset = polarVec2(32, angle);
   const headPosition = position.copy();
   headPosition.add(offset);
   const cowSeekerHitbox = new Hitbox(transformComponent, null, true, new CircularBox(headPosition, offset, 0, 30), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.COW_HEAD]);
   cowSeekerHitbox.box.pivot = createNormalisedPivotPoint(0, -0.5);
   addHitboxToTransformComponent(transformComponent, cowSeekerHitbox);
      
   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(1000);

   const statusEffectComponent = new StatusEffectComponent(0);

   const inguYetuksnoglurblidokowfleaSeekerHeadComponent = new InguYetuksnoglurblidokowfleaSeekerHeadComponent();

   return {
      entityType: EntityType.inguYetuksnoglurblidokowfleaSeekerHead,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead]: inguYetuksnoglurblidokowfleaSeekerHeadComponent
      },
      lights: []
   };
}