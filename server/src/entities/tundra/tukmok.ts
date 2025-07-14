import { createAbsolutePivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point, rotatePoint } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TukmokComponent } from "../../components/TukmokComponent";
import { createHitbox } from "../../hitboxes";
import { createTukmokTailConfig } from "./tukmok-tail";
import { createTukmokTrunkConfig } from "./tukmok-trunk";

export function createTukmokConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const bodyHitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), angle, 104, 176), 8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.TUKMOK_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const headOffset = new Point(0, 128);
   const headPosition = position.copy();
   headPosition.add(rotatePoint(headOffset, angle));
   const headHitbox = createHitbox(transformComponent, bodyHitbox, new CircularBox(headPosition, headOffset, 0, 28), 2.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.TUKMOK_HEAD]);
   headHitbox.box.pivot = createAbsolutePivotPoint(0, -20);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(250);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const tukmokComponent = new TukmokComponent();

   // 
   // Children
   // 

   const trunkOffset = new Point(0, 26);
   const trunkPosition = position.copy();
   trunkPosition.add(rotatePoint(trunkOffset, angle));

   const trunkConfig = createTukmokTrunkConfig(trunkPosition, angle, trunkOffset, headHitbox);

   const tailOffset = new Point(0, -100);
   const tailPosition = position.copy();
   tailPosition.add(rotatePoint(tailOffset, angle));
   
   const tailConfig = createTukmokTailConfig(tailPosition, angle, tailOffset, bodyHitbox);
   
   const childConfigs = [trunkConfig, tailConfig];
   
   return {
      entityType: EntityType.tukmok,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tukmok]: tukmokComponent
      },
      lights: [],
      childConfigs: childConfigs
   };
}