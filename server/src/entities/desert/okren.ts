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
import { SandBallingAI } from "../../ai/SandBallingAI";
import { EntityConfig } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { HungerComponent } from "../../components/HungerComponent";
import { OkrenAgeStage, OkrenComponent } from "../../components/OkrenComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { createHitbox } from "../../hitboxes";

const move = (okren: Entity, acceleration: number, turnSpeed: number, x: number, y: number) => {
   moveEntityToPosition(okren, x, y, acceleration, turnSpeed, 0.6);
}

// @Temporary: remove size parameter
export function createOkrenConfig(position: Point, angle: number, size: OkrenAgeStage): EntityConfig {
   const transformComponent = new TransformComponent();
   
   // Flesh body hitbox
   const fleshBodyHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), angle, 80), 5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_BODY]);
   addHitboxToTransformComponent(transformComponent, fleshBodyHitbox);

   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 1;
      
      let eyeOffset: Point;
      switch (size) {
         case OkrenAgeStage.juvenile: eyeOffset = new Point(34, 60); break;
         case OkrenAgeStage.youth:    eyeOffset = new Point(36, 66); break;
         case OkrenAgeStage.adult:    eyeOffset = new Point(42, 72); break;
         case OkrenAgeStage.elder:    eyeOffset = new Point(46, 76); break;
         case OkrenAgeStage.ancient:  eyeOffset = new Point(46, 84); break;
      }
      const eyePosition = fleshBodyHitbox.box.position.copy();
      eyePosition.add(eyeOffset);
      const eyeHitbox = createHitbox(transformComponent, fleshBodyHitbox, new CircularBox(eyePosition, eyeOffset, 0, 18), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_EYE]);
      eyeHitbox.box.flipX = sideIsFlipped;
      // @Hack
      eyeHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      addHitboxToTransformComponent(transformComponent, eyeHitbox);

      let mandibleOffset: Point;
      switch (size) {
         case OkrenAgeStage.juvenile: mandibleOffset = new Point(16, 80); break;
         case OkrenAgeStage.youth:    mandibleOffset = new Point(18, 84); break;
         case OkrenAgeStage.adult:    mandibleOffset = new Point(20, 92); break;
         case OkrenAgeStage.elder:    mandibleOffset = new Point(22, 98); break;
         case OkrenAgeStage.ancient:  mandibleOffset = new Point(22, 106); break;
      }
      const mandiblePosition = fleshBodyHitbox.box.position.copy();
      mandiblePosition.add(mandibleOffset);
      const mandibleHitbox = createHitbox(transformComponent, fleshBodyHitbox, new RectangularBox(mandiblePosition, mandibleOffset, Math.PI * 0.1, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_MANDIBLE]);
      mandibleHitbox.box.flipX = sideIsFlipped;
      // @Hack
      mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      mandibleHitbox.box.pivot = createNormalisedPivotPoint(-0.5, -0.5);
      addHitboxToTransformComponent(transformComponent, mandibleHitbox);
      
      let bigArmSegmentOffset: Point;
      switch (size) {
         case OkrenAgeStage.juvenile: bigArmSegmentOffset = new Point(52, 66); break;
         case OkrenAgeStage.youth:    bigArmSegmentOffset = new Point(64, 68); break;
         case OkrenAgeStage.adult:    bigArmSegmentOffset = new Point(74, 72); break;
         case OkrenAgeStage.elder:    bigArmSegmentOffset = new Point(80, 84); break;
         case OkrenAgeStage.ancient:  bigArmSegmentOffset = new Point(86, 88); break;
      }
      const bigArmSegmentPosition = fleshBodyHitbox.box.position.copy();
      bigArmSegmentPosition.add(bigArmSegmentOffset);
      const bigArmSegmentHitbox = createHitbox(transformComponent, fleshBodyHitbox, new RectangularBox(bigArmSegmentPosition, bigArmSegmentOffset, Math.PI * 0.3, 36, 72), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_BIG_ARM_SEGMENT]);
      bigArmSegmentHitbox.box.flipX = sideIsFlipped;
      // @Hack
      bigArmSegmentHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      bigArmSegmentHitbox.box.pivot = createAbsolutePivotPoint(-2, -38);
      addHitboxToTransformComponent(transformComponent, bigArmSegmentHitbox);

      let mediumArmSegmentOffset: Point;
      switch (size) {
         case OkrenAgeStage.juvenile: mediumArmSegmentOffset = new Point(0, 64); break;
         case OkrenAgeStage.youth:    mediumArmSegmentOffset = new Point(4, 68); break;
         case OkrenAgeStage.adult:    mediumArmSegmentOffset = new Point(4, 72); break;
         case OkrenAgeStage.elder:    mediumArmSegmentOffset = new Point(4, 74); break;
         case OkrenAgeStage.ancient:  mediumArmSegmentOffset = new Point(4, 76); break;
      }
      const mediumArmSegmentPosition = bigArmSegmentHitbox.box.position.copy();
      mediumArmSegmentPosition.add(mediumArmSegmentOffset);
      const mediumArmSegmentHitbox = createHitbox(transformComponent, bigArmSegmentHitbox, new RectangularBox(mediumArmSegmentPosition, mediumArmSegmentOffset, -Math.PI * 0.3, 20, 40), 1.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT]);
      let mediumArmPivotY: number;
      switch (size) {
         case OkrenAgeStage.juvenile: mediumArmPivotY = -28; break;
         case OkrenAgeStage.youth:    mediumArmPivotY = -32; break;
         case OkrenAgeStage.adult:    mediumArmPivotY = -36; break;
         case OkrenAgeStage.elder:    mediumArmPivotY = -36; break;
         case OkrenAgeStage.ancient:  mediumArmPivotY = -36; break;
      }
      mediumArmSegmentHitbox.box.pivot = createAbsolutePivotPoint(0, mediumArmPivotY);
      addHitboxToTransformComponent(transformComponent, mediumArmSegmentHitbox);
      
      let slashingArmSegmentOffset: Point;
      switch (size) {
         case OkrenAgeStage.juvenile: slashingArmSegmentOffset = new Point(0, 56); break;
         case OkrenAgeStage.youth:    slashingArmSegmentOffset = new Point(0, 60); break;
         case OkrenAgeStage.adult:    slashingArmSegmentOffset = new Point(0, 68); break;
         case OkrenAgeStage.elder:    slashingArmSegmentOffset = new Point(0, 76); break;
         case OkrenAgeStage.ancient:  slashingArmSegmentOffset = new Point(0, 80); break;
      }
      const slashingArmSegmentPosition = mediumArmSegmentHitbox.box.position.copy();
      slashingArmSegmentPosition.add(slashingArmSegmentOffset);
      const slashingArmSegmentHitbox = createHitbox(transformComponent, mediumArmSegmentHitbox, new RectangularBox(slashingArmSegmentPosition, slashingArmSegmentOffset, -Math.PI * 0.3, 20, 80), 0.8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION]);
      let smallArmPivotY: number;
      switch (size) {
         case OkrenAgeStage.juvenile: smallArmPivotY = -26; break;
         case OkrenAgeStage.youth:    smallArmPivotY = -30; break;
         case OkrenAgeStage.adult:    smallArmPivotY = -32; break;
         case OkrenAgeStage.elder:    smallArmPivotY = -36; break;
         case OkrenAgeStage.ancient:  smallArmPivotY = -36; break;
      }
      slashingArmSegmentHitbox.box.pivot = createAbsolutePivotPoint(0, smallArmPivotY);
      addHitboxToTransformComponent(transformComponent, slashingArmSegmentHitbox);
   }
   
   const physicsComponent = new PhysicsComponent();
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(150);

   const aiHelperComponent = new AIHelperComponent(fleshBodyHitbox, 700, move);
   aiHelperComponent.ais[AIType.okrenCombat] = new OkrenCombatAI(350, Math.PI * 1.6);
   aiHelperComponent.ais[AIType.sandBalling] = new SandBallingAI(0, 0, 4);
   
   // @Temporary
   const hungerComponent = new HungerComponent(1000, 200);
   
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
         [ServerComponentType.hunger]: hungerComponent,
         [ServerComponentType.okren]: okrenComponent
      },
      lights: []
   };
}