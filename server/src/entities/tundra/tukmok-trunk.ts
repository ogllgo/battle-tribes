import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TukmokTrunkComponent } from "../../components/TukmokTrunkComponent";
import { createHitbox } from "../../hitboxes";

export function createTukmokTrunkConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const bodyHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), angle, 28), 0.9, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.INGU_SERPENT_HEAD]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const headHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), angle, 28), 0.9, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.INGU_SERPENT_HEAD]);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(250);
   
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