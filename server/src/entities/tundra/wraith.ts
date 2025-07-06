import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { WraithComponent } from "../../components/WraithComponent";
import { createHitbox } from "../../hitboxes";

export const WRAITH_EAR_IDEAL_ANGLE = Math.PI * 0.1;

export function createWraithConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const bodyHitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), angle, 28, 40), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.WRAITH_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const headOffset = new Point(0, 56);
   const headPosition = position.copy();
   headPosition.add(headOffset);
   const headHitbox = createHitbox(transformComponent, bodyHitbox, new CircularBox(headPosition, headOffset, 0, 28), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.WRAITH_HEAD]);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 0;

      const earOffset = new Point(24, -14);
      const earPosition = headPosition.copy();
      earPosition.add(earOffset);
      const earHitbox = createHitbox(transformComponent, headHitbox, new CircularBox(earPosition, earOffset, WRAITH_EAR_IDEAL_ANGLE, 8), 0.05, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.WRAITH_EAR]);
      earHitbox.box.flipX = sideIsFlipped;
      // @Hack
      earHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      earHitbox.relativeAngleConstraints.push({ 
         idealAngle: earHitbox.box.relativeAngle,
         springConstant: 30,
         damping: 0.15
      });

      addHitboxToTransformComponent(transformComponent, earHitbox);
   }

   const physicsComponent = new PhysicsComponent();

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.freezing);
   
   const healthComponent = new HealthComponent(35);

   // const aiHelperComponent = new AIHelperComponent(hitbox, 400, moveFunc, turnFunc);
   
   const wraithComponent = new WraithComponent();
   
   return {
      entityType: EntityType.wraith,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.wraith]: wraithComponent,
      },
      lights: []
   }
}