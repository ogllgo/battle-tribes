import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { DustfleaEggComponent } from "../../components/DustfleaEggComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
<<<<<<< HEAD
import { createHitbox } from "../../hitboxes";
=======
import { Hitbox } from "../../hitboxes";
>>>>>>> 4c2bf85bd620509540da2ebb68ab21fdf0b57dae

export function createDustfleaEggConfig(position: Point, angle: number, parentOkren: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

<<<<<<< HEAD
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), angle, 12), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
=======
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 12), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
>>>>>>> 4c2bf85bd620509540da2ebb68ab21fdf0b57dae
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const physicsComponent = new PhysicsComponent();

   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(5);

   const dustfleaEggComponent = new DustfleaEggComponent(parentOkren);
   
   return {
      entityType: EntityType.dustfleaEgg,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.dustfleaEgg]: dustfleaEggComponent
      },
      lights: []
   };
}