import { createNormalisedPivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { Settings } from "../../../../shared/src/settings";
import { getAbsAngleDiff, Point, polarVec2, rotatePoint } from "../../../../shared/src/utils";
import { ChildConfigAttachInfo, EntityConfig } from "../../components";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { InguYetuksnoglurblidokowfleaComponent } from "../../components/InguYetuksnoglurblidokowfleaComponent";
import { OkrenClawGrowthStage } from "../../components/OkrenClawComponent";
import { OkrenAgeStage } from "../../components/OkrenComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { applyAccelerationFromGround, Hitbox, turnHitboxToAngle } from "../../hitboxes";
import { tetherHitboxes } from "../../tethers";
import { getEntityAgeTicks } from "../../world";
import { createOkrenClawConfig } from "../desert/okren-claw";
import { createInguYetuksnoglurblidokowfleaSeekerHeadConfig } from "./ingu-yetuksnoglurblidokowflea-seeker-head";

const moveFunc = (inguYetu: Entity, pos: Point, accelerationMagnitude: number): void => {
   // @HACKKK!!!!
   // const targetEntity = PlayerComponentArray.activeEntities[0];
   // const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   // const targetHitbox = targetTransformComponent.hitboxes[0];
   
   const transformComponent = TransformComponentArray.getComponent(inguYetu);
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_1) || hitbox.flags.includes(HitboxFlag.YETUK_BODY_2) || hitbox.flags.includes(HitboxFlag.YETUK_BODY_3) || hitbox.flags.includes(HitboxFlag.YETUK_GLURB_SEGMENT)) {
         let moveDir: number;
         if (i === 0) {
            moveDir = hitbox.box.angle;
         } else {
            const previousHitbox = transformComponent.hitboxes[i - 1] as Hitbox;
            moveDir = hitbox.box.position.calculateAngleBetween(previousHitbox.box.position);
         }
         
         const isHeadHitbox = hitbox.flags.includes(HitboxFlag.YETUK_BODY_1);
         const acc = accelerationMagnitude * (isHeadHitbox ? 1.2 : 0.6) * 0.5;
         const connectingVel = polarVec2(acc, moveDir);

         // const dirToTarget = hitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
         const dirToTarget = hitbox.box.position.calculateAngleBetween(pos);
         const velToTarget = polarVec2(accelerationMagnitude * (isHeadHitbox ? 1.2 : 0.6) * 0.5, dirToTarget);

         applyAccelerationFromGround(hitbox, new Point(connectingVel.x + velToTarget.x, connectingVel.y + velToTarget.y));
      }
   }
}

const turnFunc = (inguYetu: Entity, _pos: Point, turnSpeed: number, turnDamping: number): void => {
   // @HACKKK!!!!
   // const targetEntity = PlayerComponentArray.activeEntities[0];
   // const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   // const targetHitbox = targetTransformComponent.hitboxes[0];

   // const pos = predictHitboxPos(targetHitbox, 0.3);
   const pos = _pos;

   const transformComponent = TransformComponentArray.getComponent(inguYetu);
   const headHitbox = transformComponent.rootHitboxes[0];

   const targetDirection = headHitbox.box.position.calculateAngleBetween(pos);

   const absDiff = getAbsAngleDiff(headHitbox.box.angle, targetDirection);
   const angleDiffStopWiggle = 0.85;
   const wiggleMultiplier = 1 - Math.pow(Math.min(absDiff, angleDiffStopWiggle) / angleDiffStopWiggle, 2);
   
   // const idealAngle = targetDirection + Math.PI * 0.45 * Math.sin(getEntityAgeTicks(serpent) / Settings.TPS * 7) * wiggleMultiplier;
   const idealAngle = targetDirection + Math.PI * 0.45 * Math.sin(getEntityAgeTicks(inguYetu) / Settings.TPS * 7);
   turnHitboxToAngle(headHitbox, idealAngle, turnSpeed, turnDamping, false);
}

export function createInguYetuksnoglurblidokowfleaConfig(position: Point, angle: number): EntityConfig {
   const BODY_SEGMENT_SEPARATION = 140;

   const childConfigs = new Array<ChildConfigAttachInfo>();
   
   const transformComponent = new TransformComponent();

   const body1Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_1]);
   addHitboxToTransformComponent(transformComponent, body1Hitbox);

   const headOffset = new Point(0, 60);
   const headPosition = position.copy();
   headPosition.add(headOffset);
   const headHitbox = new Hitbox(transformComponent, body1Hitbox, true, new CircularBox(headPosition, headOffset, 0, 28), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETI_HEAD]);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   // Head mandibles
   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 1;

      {
         const mandibleOffset = new Point(12, 36);
         const mandiblePosition = headHitbox.box.position.copy();
         mandiblePosition.add(mandibleOffset);
         const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(mandiblePosition, mandibleOffset, Math.PI * 0.1, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_BIG]);
         mandibleHitbox.box.flipX = sideIsFlipped;
         // @Hack
         mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
         mandibleHitbox.box.pivot = createNormalisedPivotPoint(-0.5, -0.5);
         addHitboxToTransformComponent(transformComponent, mandibleHitbox);
      }

      {
         const mandibleOffset = new Point(18, 32);
         const mandiblePosition = headHitbox.box.position.copy();
         mandiblePosition.add(mandibleOffset);
         const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(mandiblePosition, mandibleOffset, Math.PI * 0.2, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_MEDIUM]);
         mandibleHitbox.box.flipX = sideIsFlipped;
         // @Hack
         mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
         mandibleHitbox.box.pivot = createNormalisedPivotPoint(-0.5, -0.5);
         addHitboxToTransformComponent(transformComponent, mandibleHitbox);
      }
   }

   const body2Offset = new Point(0, -BODY_SEGMENT_SEPARATION);
   const body2Position = position.copy();
   body2Position.add(rotatePoint(body2Offset, angle));
   const body2Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(body2Position, new Point(0, 0), 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_2]);
   addHitboxToTransformComponent(transformComponent, body2Hitbox);

   // Cow's seeker head
   {
      const seekerOffset = new Point(52, 52);
      const trunkPosition = body2Hitbox.box.position.copy();
      trunkPosition.add(rotatePoint(seekerOffset, angle));
      const seekerHeadConfig = createInguYetuksnoglurblidokowfleaSeekerHeadConfig(trunkPosition, angle, seekerOffset);
      childConfigs.push({
         entityConfig: seekerHeadConfig,
         attachedHitbox: seekerHeadConfig.components[ServerComponentType.transform]!.hitboxes[0],
         parentHitbox: body2Hitbox,
         isPartOfParent: true
      });
   }
   
   const body3Offset = new Point(0, -BODY_SEGMENT_SEPARATION);
   const body3Position = body2Position.copy();
   body3Position.add(rotatePoint(body3Offset, angle));
   const body3Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(body3Position, new Point(0, 0), 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_3]);
   addHitboxToTransformComponent(transformComponent, body3Hitbox);
   
   const body4Offset = new Point(0, -BODY_SEGMENT_SEPARATION);
   const body4Position = body3Position.copy();
   body4Position.add(rotatePoint(body4Offset, angle));
   const body4Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(body4Position, new Point(0, 0), 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_4]);
   addHitboxToTransformComponent(transformComponent, body4Hitbox);

   const mainBodySegments = [body1Hitbox, body2Hitbox, body3Hitbox, body4Hitbox];
   
   for (let i = 0; i < mainBodySegments.length - 1; i++) {
      const bodySegment = mainBodySegments[i];
      const nextBodySegment = mainBodySegments[i + 1];

      // Make a glurb segment!
      const offset = new Point(0, -BODY_SEGMENT_SEPARATION * 0.5);
      const glurbSegmentPosition = bodySegment.box.position.copy();
      glurbSegmentPosition.add(rotatePoint(offset, angle));
      const glurbSegmentHitbox = new Hitbox(transformComponent, null, true, new CircularBox(glurbSegmentPosition, new Point(0, 0), angle, 28), 0.8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_GLURB_SEGMENT]);
      addHitboxToTransformComponent(transformComponent, glurbSegmentHitbox);

      const idealDist = BODY_SEGMENT_SEPARATION * 0.5;
      
      // Tethers
      tetherHitboxes(glurbSegmentHitbox, bodySegment, idealDist, 1000, 2);
      // @Hack: method of adding
      glurbSegmentHitbox.angularTethers.push({
         originHitbox: bodySegment,
         idealAngle: 0,
         springConstant: 150,
         damping: 0.85,
         padding: Math.PI * 0.1,
         idealHitboxAngleOffset: 0
      });
      tetherHitboxes(nextBodySegment, glurbSegmentHitbox, idealDist, 1000, 2);
      // @Hack: method of adding
      nextBodySegment.angularTethers.push({
         originHitbox: glurbSegmentHitbox,
         idealAngle: Math.PI,
         springConstant: 150,
         damping: 0.85,
         padding: Math.PI * 0.1,
         idealHitboxAngleOffset: Math.PI
      });
   }

   // Create claws on each body segment
   for (const bodySegment of mainBodySegments) {
      for (let i = 0; i < 2; i++) {
         const sideIsFlipped = i === 1;
         const clawConfig = createOkrenClawConfig(bodySegment.box.position.copy(), 0, OkrenAgeStage.youth, OkrenClawGrowthStage.FOUR, sideIsFlipped);
         // @HACK
         clawConfig.components[ServerComponentType.transform]!.hitboxes[0].box.offset.x = 40;
         clawConfig.components[ServerComponentType.transform]!.hitboxes[0].box.offset.y = 40;
         childConfigs.push({
            entityConfig: clawConfig,
            attachedHitbox: clawConfig.components[ServerComponentType.transform]!.hitboxes[0],
            parentHitbox: bodySegment,
            isPartOfParent: true
         });
      }
   }
   
   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(1000);

   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(body1Hitbox, 600, moveFunc, turnFunc);

   const inguYetuksnoglurblidokowfleaComponent = new InguYetuksnoglurblidokowfleaComponent();
   
   return {
      entityType: EntityType.inguYetuksnoglurblidokowflea,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.inguYetuksnoglurblidokowflea]: inguYetuksnoglurblidokowfleaComponent
      },
      lights: [],
      childConfigs: childConfigs
   };
}