import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { EntityType, Entity } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { FrozenYetiComponent } from "../../components/FrozenYetiComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import Layer from "../../Layer";
import { TileType } from "battletribes-shared/tiles";
import WanderAI from "../../ai/WanderAI";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { createHitbox } from "../../hitboxes";
import { moveEntityToPosition } from "../../ai-shared";

export const enum FrozenYetiVars {
   VISION_RANGE = 350,
   FROZEN_YETI_SIZE = 144
}

export const FROZEN_YETI_GLOBAL_ATTACK_COOLDOWN = 1.25;
export const FROZEN_YETI_BITE_COOLDOWN = 5;
export const FROZEN_YETI_SNOWBALL_THROW_COOLDOWN = 10;
export const FROZEN_YETI_ROAR_COOLDOWN = 10;
export const FROZEN_YETI_STOMP_COOLDOWN = 10;

export interface FrozenYetiTargetInfo {
   damageDealtToSelf: number;
   timeSinceLastAggro: number;
}

export interface FrozenYetiRockSpikeInfo {
   readonly positionX: number;
   readonly positionY: number;
   readonly size: number;
}

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return layer.getTileTypeAtPosition(x, y) === TileType.fimbultur;
}

const moveFunc = (): void => {
   throw new Error();
}

export function createFrozenYetiConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const bodyHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, FrozenYetiVars.FROZEN_YETI_SIZE / 2), 4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const headHitbox = createHitbox(transformComponent, bodyHitbox, new CircularBox(new Point(0, 0), new Point(0, 60), 0, 36), 0.8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   // Paw hitboxes
   for (let i = 0; i < 2; i++) {
      const pawDirection = (Math.PI / 3.5) * (i === 0 ? -1 : 1);
      const hitbox = createHitbox(transformComponent, bodyHitbox, new CircularBox(new Point(0, 0), Point.fromVectorForm(80, pawDirection), 0, 16), 0.6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
      addHitboxToTransformComponent(transformComponent, hitbox);
   }

   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(250);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.freezing);
   
   const aiHelperComponent = new AIHelperComponent(headHitbox, FrozenYetiVars.VISION_RANGE, moveFunc, moveFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, Math.PI * 0.7, 0, 0.6, positionIsValidCallback);
   
   const frozenYetiComponent = new FrozenYetiComponent();
   
   return {
      entityType: EntityType.frozenYeti,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.frozenYeti]: frozenYetiComponent
      },
      lights: []
   };
}

// export function onFrozenYetiCollision(frozenYeti: Entity, collidingEntity: Entity, collisionPoint: Point): void {
//    const collidingEntityType = getEntityType(collidingEntity);
   
//    if (collidingEntity === null || collidingEntityType === EntityType.iceSpikes) {
//       return;
//    }

//    // Don't deal collision damage to frozen yetis which aren't attacking them
//    if (collidingEntityType === EntityType.frozenYeti) {
//       const yetiComponent = FrozenYetiComponentArray.getComponent(frozenYeti);
//       if (!yetiComponent.attackingEntities.hasOwnProperty(collidingEntity)) {
//          return;
//       }
//    }

//    if (HealthComponentArray.hasComponent(collidingEntity)) {
//       const healthComponent = HealthComponentArray.getComponent(collidingEntity);
//       if (!canDamageEntity(healthComponent, "frozen_yeti")) {
//          return;
//       }
      
//       const transformComponent = TransformComponentArray.getComponent(frozenYeti);
//       const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
//       const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

//       damageEntity(collidingEntity, frozenYeti, 5, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
//       applyKnockback(collidingEntity, 250, hitDirection);

//       addLocalInvulnerabilityHash(collidingEntity, "frozen_yeti", 0.3);
//    }
// }