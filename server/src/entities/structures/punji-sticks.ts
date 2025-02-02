import { Entity, EntityType, DamageSource } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityRelationship, getEntityRelationship, TribeComponent } from "../../components/TribeComponent";
import { SpikesComponent, SpikesComponentArray } from "../../components/SpikesComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { createWallPunjiSticksHitboxes, createFloorPunjiSticksHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { EntityConfig } from "../../components";
import { ServerComponentType } from "battletribes-shared/components";
import { getEntityType } from "../../world";
import { TransformComponent } from "../../components/TransformComponent";
import { StructureComponent } from "../../components/StructureComponent";
import Tribe from "../../Tribe";
import { PunjiSticksComponent } from "../../components/PunjiSticksComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { StructureConnection } from "../../../../shared/src/structures";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.spikes
   | ServerComponentType.punjiSticks;

export function createFloorPunjiSticksConfig(tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createFloorPunjiSticksHitboxes(), null);
   
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

export function createWallPunjiSticksConfig(tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createWallPunjiSticksHitboxes(), null);
   
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
   damageEntity(collidingEntity, punjiSticks, 1, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(collidingEntity, "punjiSticks", 0.3);

   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 2 * Settings.TPS);
   }
}