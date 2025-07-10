import { createNormalisedPivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { TileType } from "../../../../shared/src/tiles";
import { Point, polarVec2, randInt, rotatePoint } from "../../../../shared/src/utils";
import { turnToPosition } from "../../ai-shared";
import WanderAI from "../../ai/WanderAI";
import { EntityConfig } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { InguSerpentComponent } from "../../components/InguSerpentComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { applyAccelerationFromGround, createHitbox, Hitbox } from "../../hitboxes";
import Layer from "../../Layer";
import { tetherHitboxes } from "../../tethers";

registerEntityLootOnDeath(EntityType.inguSerpent, [
   {
      itemType: ItemType.inguSerpentTooth,
      getAmount: () => randInt(2, 3)
   }
]);

const moveFunc = (serpentHead: Entity, pos: Point, accelerationMagnitude: number): void => {
   const transformComponent = TransformComponentArray.getComponent(serpentHead);
   const headHitbox = transformComponent.rootChildren[0] as Hitbox;
   
   const bodyToTargetDirection = headHitbox.box.position.calculateAngleBetween(pos);
   applyAccelerationFromGround(serpentHead, headHitbox, polarVec2(accelerationMagnitude, bodyToTargetDirection));
}

const turnFunc = (serpentHead: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   turnToPosition(serpentHead, pos, turnSpeed, turnDamping);
}

function wanderPositionIsValid(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return layer.getTileTypeAtPosition(x, y) === TileType.permafrost;
}

export function createInguSerpentConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const headHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), angle, 28), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.INGU_SERPENT_HEAD]);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   const idealBody1Dist = 56;

   const body1Offset = new Point(0, -idealBody1Dist);
   const body1Position = position.copy();
   // @Hack: this rotation operation
   body1Position.add(rotatePoint(body1Offset, angle));
   const body1Hitbox = createHitbox(transformComponent, null, new CircularBox(body1Position, body1Offset, 0, 28), 0.75, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.INGU_SERPENT_BODY_1]);
   body1Hitbox.box.pivot = createNormalisedPivotPoint(0, -0.5);
   addHitboxToTransformComponent(transformComponent, body1Hitbox);
   
   tetherHitboxes(body1Hitbox, headHitbox, transformComponent, transformComponent, idealBody1Dist, 100, 1.2);
   // @Hack: method of adding
   body1Hitbox.angularTethers.push({
      originHitbox: headHitbox,
      idealAngle: Math.PI,
      springConstant: 122,
      damping: 0,
      padding: Math.PI * 0.04,
      idealHitboxAngleOffset: Math.PI
   });

   const idealBody2Dist = 56;

   const body2Offset = new Point(0, -idealBody2Dist);
   const body2Position = body1Position.copy();
   // @Hack: this rotation operation
   body2Position.add(rotatePoint(body2Offset, angle));
   const body2Hitbox = createHitbox(transformComponent, null, new CircularBox(body2Position, body2Offset, 0, 28), 0.75, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.INGU_SERPENT_BODY_2]);
   body2Hitbox.box.pivot = createNormalisedPivotPoint(0, -0.5);
   addHitboxToTransformComponent(transformComponent, body2Hitbox);
   
   tetherHitboxes(body2Hitbox, body1Hitbox, transformComponent, transformComponent, idealBody2Dist, 100, 1.2);
   // @Hack: method of adding
   body2Hitbox.angularTethers.push({
      originHitbox: body1Hitbox,
      idealAngle: Math.PI,
      springConstant: 122,
      damping: 0,
      padding: Math.PI * 0.04,
      idealHitboxAngleOffset: Math.PI
   });

   const idealTailDist = 56;

   const tailOffset = new Point(0, -idealTailDist);
   const tailPosition = body2Position.copy();
   tailPosition.add(tailOffset);
   const tailHitbox = createHitbox(transformComponent, null, new CircularBox(tailPosition, tailOffset, 0, 28), 0.75, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.INGU_SERPENT_TAIL]);
   tailHitbox.box.pivot = createNormalisedPivotPoint(0, -0.5);
   addHitboxToTransformComponent(transformComponent, tailHitbox);
   
   tetherHitboxes(tailHitbox, body2Hitbox, transformComponent, transformComponent, idealTailDist, 100, 1.2);
   // @Hack: method of adding
   tailHitbox.angularTethers.push({
      originHitbox: body2Hitbox,
      idealAngle: Math.PI,
      springConstant: 122,
      damping: 0,
      padding: Math.PI * 0.04,
      idealHitboxAngleOffset: Math.PI
   });

   const physicsComponent = new PhysicsComponent();

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.freezing);
   
   const healthComponent = new HealthComponent(25);

   const aiHelperComponent = new AIHelperComponent(headHitbox, 550, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(750, 14 * Math.PI, 0.7, 0.35, wanderPositionIsValid);

   const lootComponent = new LootComponent();
   
   const inguSerpentComponent = new InguSerpentComponent();
   
   return {
      entityType: EntityType.inguSerpent,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.inguSerpent]: inguSerpentComponent,
      },
      lights: []
   }
}