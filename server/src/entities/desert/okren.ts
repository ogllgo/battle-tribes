import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { OkrenComponent } from "../../components/OkrenComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { createHitbox } from "../../hitboxes";

export function createOkrenConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const bodyHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), angle, 64), 0.2, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   for (let i = 0; i < 2; i++) {
      const eyeOffset = new Point(44 * (i === 0 ? 1 : -1), 84);
      const eyePosition = bodyHitbox.box.position.copy();
      eyePosition.add(eyeOffset);
      const eyeHitbox = createHitbox(transformComponent, bodyHitbox, new RectangularBox(eyePosition, eyeOffset, 0, 20, 20), 0.1, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_EYE]);
      addHitboxToTransformComponent(transformComponent, eyeHitbox);

      const mandibleOffset = new Point(24 * (i === 0 ? 1 : -1), 92);
      const mandiblePosition = bodyHitbox.box.position.copy();
      mandiblePosition.add(mandibleOffset);
      const mandibleHitbox = createHitbox(transformComponent, bodyHitbox, new RectangularBox(mandiblePosition, mandibleOffset, 0, 20, 20), 0.1, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_MANDIBLE]);
      addHitboxToTransformComponent(transformComponent, mandibleHitbox);
      
      const bigArmSegmentOffset = Point.fromVectorForm(136, Math.PI * 0.3 * (i === 0 ? 1 : -1));
      bigArmSegmentOffset.x += 12 * (i === 0 ? 1 : -1);
      bigArmSegmentOffset.y -= 12;
      const bigArmSegmentPosition = bodyHitbox.box.position.copy();
      bigArmSegmentPosition.add(bigArmSegmentOffset);
      const bigArmSegmentHitbox = createHitbox(transformComponent, bodyHitbox, new RectangularBox(bigArmSegmentPosition, bigArmSegmentOffset, Math.PI * 0.3 * (i === 0 ? 1 : -1), 20, 40), 1, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_BIG_ARM_SEGMENT]);
      addHitboxToTransformComponent(transformComponent, bigArmSegmentHitbox);

      const mediumArmSegmentOffset = Point.fromVectorForm(40, -Math.PI * 0.3 * (i === 0 ? 1 : -1));
      mediumArmSegmentOffset.y += 36;
      const mediumArmSegmentPosition = bigArmSegmentHitbox.box.position.copy();
      mediumArmSegmentPosition.add(mediumArmSegmentOffset);
      const mediumArmSegmentHitbox = createHitbox(transformComponent, bigArmSegmentHitbox, new RectangularBox(mediumArmSegmentPosition, mediumArmSegmentOffset, -Math.PI * 0.3 * (i === 0 ? 1 : -1), 20, 40), 0.8, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT]);
      addHitboxToTransformComponent(transformComponent, mediumArmSegmentHitbox);
      
      const slashingArmSegmentOffset = Point.fromVectorForm(48, -Math.PI * 0.3 * (i === 0 ? 1 : -1));
      slashingArmSegmentOffset.y += 20;
      const slashingArmSegmentPosition = mediumArmSegmentHitbox.box.position.copy();
      slashingArmSegmentPosition.add(slashingArmSegmentOffset);
      const slashingArmSegmentHitbox = createHitbox(transformComponent, mediumArmSegmentHitbox, new RectangularBox(slashingArmSegmentPosition, slashingArmSegmentOffset, -Math.PI * 0.3 * (i === 0 ? 1 : -1), 20, 40), 0.6, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION]);
      addHitboxToTransformComponent(transformComponent, slashingArmSegmentHitbox);
   }
   
   const physicsComponent = new PhysicsComponent();
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(bodyHitbox, 240);
   
   const okrenComponent = new OkrenComponent();
   
   return {
      entityType: EntityType.okren,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.okren]: okrenComponent
      },
      lights: []
   };
}