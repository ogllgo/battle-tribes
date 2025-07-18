import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityRelationship, getEntityRelationship, TribeComponent } from "../../components/TribeComponent";
import { SpikesComponent, SpikesComponentArray } from "../../components/SpikesComponent";
import { EntityConfig } from "../../components";
import { ServerComponentType } from "battletribes-shared/components";
import { getEntityType } from "../../world";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { StructureComponent } from "../../components/StructureComponent";
import Tribe from "../../Tribe";
import { PunjiSticksComponent } from "../../components/PunjiSticksComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { Hitbox } from "../../hitboxes";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { StructureConnection } from "../../structure-placement";

export function createFloorPunjiSticksConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = new RectangularBox(position, new Point(0, 0), rotation, 48, 48);
   const hitbox = new Hitbox(transformComponent, null, true, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(10);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const spikesComponent = new SpikesComponent();
   
   const punjiSticksComponent = new PunjiSticksComponent();
   
   return {
      entityType: EntityType.floorPunjiSticks,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.spikes]: spikesComponent,
         [ServerComponentType.punjiSticks]: punjiSticksComponent
      },
      lights: []
   };
}

export function createWallPunjiSticksConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = new RectangularBox(position, new Point(0, 0), rotation, 56, 32);
   const hitbox = new Hitbox(transformComponent, null, true, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(10);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const spikesComponent = new SpikesComponent();
   
   const punjiSticksComponent = new PunjiSticksComponent();
   
   return {
      entityType: EntityType.wallPunjiSticks,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.spikes]: spikesComponent,
         [ServerComponentType.punjiSticks]: punjiSticksComponent
      },
      lights: []
   };
}

export function onPunjiSticksCollision(punjiSticks: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   // @Incomplete: Why is this condition neeeded? Shouldn't be able to be placed colliding with other structures anyway.
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.floorSpikes || collidingEntityType === EntityType.wallSpikes || collidingEntityType === EntityType.door || collidingEntityType === EntityType.wall) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Don't collide with friendly entities if the spikes are covered
   const spikesComponent = SpikesComponentArray.getComponent(punjiSticks);
   if (spikesComponent.isCovered && getEntityRelationship(punjiSticks, collidingEntity) === EntityRelationship.friendly) {
      return;
   }

   // Reveal
   spikesComponent.isCovered = false;

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "punjiSticks")) {
      return;
   }
   
   // @Incomplete: Cause of death
   // @INCOMPLETE
   // hitEntity(collidingEntity, punjiSticks, 1, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(collidingEntity, "punjiSticks", 0.3);

   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 2 * Settings.TPS);
   }
}