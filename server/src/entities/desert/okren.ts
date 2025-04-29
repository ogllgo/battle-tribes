import { createAbsolutePivotPoint, createNormalisedPivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { moveEntityToPosition } from "../../ai-shared";
import { OkrenCombatAI } from "../../ai/OkrenCombatAI";
import { EntityConfig } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { OkrenAgeStage, OkrenComponent } from "../../components/OkrenComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { createHitbox } from "../../hitboxes";

const move = (okren: Entity, acceleration: number, turnSpeed: number, x: number, y: number) => {
   moveEntityToPosition(okren, x, y, acceleration, turnSpeed);
}

// @Temporary: remove size parameter
export function createOkrenConfig(position: Point, angle: number, size: OkrenAgeStage): EntityConfig {
   const transformComponent = new TransformComponent();
   
   // @temporary: return mass to 5 once done!
   const bodyHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), angle, 64), 1.7, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 1;
      
      let eyeOffset: Point;
      switch (size) {
         case OkrenAgeStage.juvenile: eyeOffset = new Point(34, 60); break;
         case OkrenAgeStage.youth:    eyeOffset = new Point(38, 64); break;
         case OkrenAgeStage.adult:    eyeOffset = new Point(42, 72); break;
         case OkrenAgeStage.elder:    eyeOffset = new Point(46, 76); break;
         case OkrenAgeStage.ancient:  eyeOffset = new Point(46, 84); break;
      }
      const eyePosition = bodyHitbox.box.position.copy();
      eyePosition.add(eyeOffset);
      const eyeHitbox = createHitbox(transformComponent, bodyHitbox, new CircularBox(eyePosition, eyeOffset, 0, 18), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_EYE]);
      eyeHitbox.box.flipX = sideIsFlipped;
      // @Hack
      eyeHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      addHitboxToTransformComponent(transformComponent, eyeHitbox);

      let mandibleOffset: Point;
      switch (size) {
         case OkrenAgeStage.juvenile: mandibleOffset = new Point(16, 80); break;
         case OkrenAgeStage.youth:    mandibleOffset = new Point(18, 84); break;
         case OkrenAgeStage.adult:    mandibleOffset = new Point(18, 88); break;
         case OkrenAgeStage.elder:    mandibleOffset = new Point(22, 96); break;
         case OkrenAgeStage.ancient:  mandibleOffset = new Point(22, 104); break;
      }
      const mandiblePosition = bodyHitbox.box.position.copy();
      mandiblePosition.add(mandibleOffset);
      const mandibleHitbox = createHitbox(transformComponent, bodyHitbox, new RectangularBox(mandiblePosition, mandibleOffset, Math.PI * 0.1, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_MANDIBLE]);
      mandibleHitbox.box.flipX = sideIsFlipped;
      // @Hack
      mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      mandibleHitbox.box.pivot = createNormalisedPivotPoint(-0.5, -0.5);
      addHitboxToTransformComponent(transformComponent, mandibleHitbox);
      
      let bigArmSegmentOffset: Point;
      switch (size) {
         case OkrenAgeStage.juvenile: bigArmSegmentOffset = new Point(58, 62); break;
         case OkrenAgeStage.youth:    bigArmSegmentOffset = new Point(66, 64); break;
         case OkrenAgeStage.adult:    bigArmSegmentOffset = new Point(74, 66); break;
         case OkrenAgeStage.elder:    bigArmSegmentOffset = new Point(82, 66); break;
         case OkrenAgeStage.ancient:  bigArmSegmentOffset = new Point(90, 66); break;
      }
      const bigArmSegmentPosition = bodyHitbox.box.position.copy();
      bigArmSegmentPosition.add(bigArmSegmentOffset);
      const bigArmSegmentHitbox = createHitbox(transformComponent, bodyHitbox, new RectangularBox(bigArmSegmentPosition, bigArmSegmentOffset, Math.PI * 0.3, 36, 72), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_BIG_ARM_SEGMENT]);
      bigArmSegmentHitbox.box.flipX = sideIsFlipped;
      // @Hack
      bigArmSegmentHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      bigArmSegmentHitbox.box.pivot = createAbsolutePivotPoint(-2, -38);
      addHitboxToTransformComponent(transformComponent, bigArmSegmentHitbox);

      const mediumArmSegmentOffset = Point.fromVectorForm(40, -Math.PI * 0.3);
      mediumArmSegmentOffset.x += 36;
      mediumArmSegmentOffset.y += 48;
      const mediumArmSegmentPosition = bigArmSegmentHitbox.box.position.copy();
      mediumArmSegmentPosition.add(mediumArmSegmentOffset);
      const mediumArmSegmentHitbox = createHitbox(transformComponent, bigArmSegmentHitbox, new RectangularBox(mediumArmSegmentPosition, mediumArmSegmentOffset, -Math.PI * 0.3, 20, 40), 1.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT]);
      mediumArmSegmentHitbox.box.pivot = createAbsolutePivotPoint(0, -36);
      addHitboxToTransformComponent(transformComponent, mediumArmSegmentHitbox);
      
      const slashingArmSegmentOffset = Point.fromVectorForm(40, -Math.PI * 0.3);
      slashingArmSegmentOffset.x += 32;
      slashingArmSegmentOffset.y += 40;
      const slashingArmSegmentPosition = mediumArmSegmentHitbox.box.position.copy();
      slashingArmSegmentPosition.add(slashingArmSegmentOffset);
      const slashingArmSegmentHitbox = createHitbox(transformComponent, mediumArmSegmentHitbox, new RectangularBox(slashingArmSegmentPosition, slashingArmSegmentOffset, -Math.PI * 0.3, 20, 80), 0.8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION]);
      slashingArmSegmentHitbox.box.pivot = createAbsolutePivotPoint(0, -32);
      addHitboxToTransformComponent(transformComponent, slashingArmSegmentHitbox);
   }
   
   const physicsComponent = new PhysicsComponent();
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(500000);

   const aiHelperComponent = new AIHelperComponent(bodyHitbox, 540, move);
   aiHelperComponent.ais[AIType.okrenCombat] = new OkrenCombatAI(250, Math.PI * 0.4);
   
   const okrenComponent = new OkrenComponent();
   okrenComponent.size = size;
   
   return {
      entityType: EntityType.okren,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.okren]: okrenComponent
      },
      lights: []
   };
}