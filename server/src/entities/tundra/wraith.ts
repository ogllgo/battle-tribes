import { createNormalisedPivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point, polarVec2, randInt } from "../../../../shared/src/utils";
import { accelerateEntityToPosition, turnToPosition } from "../../ai-shared";
import { EntityConfig } from "../../components";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { registerEntityLootOnDeath } from "../../components/LootComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { WraithComponent } from "../../components/WraithComponent";
import { applyAcceleration, applyAccelerationFromGround, createHitbox, Hitbox, turnHitboxToAngle } from "../../hitboxes";
import { tetherHitboxes } from "../../tethers";

export const WRAITH_EAR_IDEAL_ANGLE = Math.PI * 0.1;

registerEntityLootOnDeath(EntityType.wraith, [
   {
      itemType: ItemType.wraithTooth,
      getAmount: () => randInt(2, 3)
   }
]);

const moveFunc = (wraith: Entity, pos: Point, accelerationMagnitude: number): void => {
   const transformComponent = TransformComponentArray.getComponent(wraith);
   
   const bodyHitbox = transformComponent.rootChildren[0] as Hitbox;
   const bodyToTargetDirection = bodyHitbox.box.position.calculateAngleBetween(pos);
   applyAccelerationFromGround(wraith, bodyHitbox, polarVec2(accelerationMagnitude, bodyToTargetDirection));
   
   const headHitbox = transformComponent.children[1] as Hitbox;
   const headToTargetDirection = headHitbox.box.position.calculateAngleBetween(pos);
   // @Hack?
   const headAcceleration = accelerationMagnitude;
   applyAcceleration(headHitbox, polarVec2(headAcceleration, headToTargetDirection));
}

const turnFunc = (wraith: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   const transformComponent = TransformComponentArray.getComponent(wraith);
   
   const bodyHitbox = transformComponent.rootChildren[0] as Hitbox;
   const bodyToTargetDirection = bodyHitbox.box.position.calculateAngleBetween(pos);
   turnHitboxToAngle(bodyHitbox, bodyToTargetDirection, turnSpeed, turnDamping, false);

   const headHitbox = transformComponent.children[1] as Hitbox;
   const headToTargetDirection = headHitbox.box.position.calculateAngleBetween(pos);
   turnHitboxToAngle(headHitbox, headToTargetDirection, 2 * Math.PI, 0.5, false);
}

export function createWraithConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const bodyHitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), angle, 48, 76), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.WRAITH_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const idealHeadDist = 56;

   const headOffset = new Point(0, idealHeadDist);
   const headPosition = position.copy();
   headPosition.add(headOffset);
   const headHitbox = createHitbox(transformComponent, null, new CircularBox(headPosition, headOffset, 0, 28), 0.75, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.WRAITH_HEAD]);
   headHitbox.box.pivot = createNormalisedPivotPoint(0, -0.5);
   addHitboxToTransformComponent(transformComponent, headHitbox);
   
   tetherHitboxes(headHitbox, bodyHitbox, transformComponent, transformComponent, idealHeadDist, 80, 1);
   // @Hack: method of adding
   headHitbox.angularTethers.push({
      originHitbox: bodyHitbox,
      idealAngle: 0,
      springConstant: 38,
      damping: 0,
      padding: Math.PI * 0.08
   });

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

   const aiHelperComponent = new AIHelperComponent(headHitbox, 550, moveFunc, turnFunc);
   
   const wraithComponent = new WraithComponent();
   
   return {
      entityType: EntityType.wraith,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.wraith]: wraithComponent,
      },
      lights: []
   }
}