import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType, DamageSource, Entity } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { FrozenYetiComponent, FrozenYetiComponentArray } from "../../components/FrozenYetiComponent";
import { applyKnockback, PhysicsComponent } from "../../components/PhysicsComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { EntityConfig } from "../../components";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { getEntityType } from "../../world";
import Layer from "../../Layer";
import { TileType } from "battletribes-shared/tiles";
import WanderAI from "../../ai/WanderAI";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";

export const enum FrozenYetiVars {
   VISION_RANGE = 350,
   FROZEN_YETI_SIZE = 144
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.frozenYeti;

const HEAD_HITBOX_SIZE = 72;
const HEAD_DISTANCE = 60;
const PAW_SIZE = 32;
const PAW_OFFSET = 80;
const PAW_RESTING_ANGLE = Math.PI / 3.5;

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
   return !layer.positionHasWall(x, y) && layer.getTileTypeAtPosition(x, y) === TileType.fimbultur;
}

export function createFrozenYetiConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   
   const bodyHitbox = createHitbox(new CircularBox(new Point(0, 0), 0, FrozenYetiVars.FROZEN_YETI_SIZE / 2), 4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(bodyHitbox, null);

   const headHitbox = createHitbox(new CircularBox(new Point(0, HEAD_DISTANCE), 0, HEAD_HITBOX_SIZE / 2), 0.8, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(headHitbox, null);

   // Paw hitboxes
   for (let i = 0; i < 2; i++) {
      const pawDirection = PAW_RESTING_ANGLE * (i === 0 ? -1 : 1);
      const hitbox = createHitbox(new CircularBox(Point.fromVectorForm(PAW_OFFSET, pawDirection), 0, PAW_SIZE / 2), 0.6, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
      transformComponent.addHitbox(hitbox, null);
   }

   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(250);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.freezing);
   
   const aiHelperComponent = new AIHelperComponent(FrozenYetiVars.VISION_RANGE);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, Math.PI * 0.7, 0.6, positionIsValidCallback);
   
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
      }
   };
}

export function onFrozenYetiCollision(frozenYeti: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   
   if (collidingEntity === null || collidingEntityType === EntityType.iceSpikes) {
      return;
   }

   // Don't deal collision damage to frozen yetis which aren't attacking them
   if (collidingEntityType === EntityType.frozenYeti) {
      const yetiComponent = FrozenYetiComponentArray.getComponent(frozenYeti);
      if (!yetiComponent.attackingEntities.hasOwnProperty(collidingEntity)) {
         return;
      }
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "frozen_yeti")) {
         return;
      }
      
      const transformComponent = TransformComponentArray.getComponent(frozenYeti);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

      damageEntity(collidingEntity, frozenYeti, 5, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 250, hitDirection);

      addLocalInvulnerabilityHash(healthComponent, "frozen_yeti", 0.3);
   }
}