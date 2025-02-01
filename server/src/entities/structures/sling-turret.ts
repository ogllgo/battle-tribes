import { EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { ServerComponentType } from "battletribes-shared/components";
import { createSlingTurretHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { EntityConfig } from "../../components";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { TurretComponent } from "../../components/TurretComponent";
import Tribe from "../../Tribe";
import { SlingTurretComponent } from "../../components/SlingTurretComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { StructureConnection } from "../../../../shared/src/structures";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.aiHelper
   | ServerComponentType.turret
   | ServerComponentType.slingTurret;

export const SLING_TURRET_SHOT_COOLDOWN_TICKS = 1.5 * Settings.TPS;
export const SLING_TURRET_RELOAD_TIME_TICKS = Math.floor(0.4 * Settings.TPS);

export function createSlingTurretConfig(tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addStaticHitboxes(createSlingTurretHitboxes(), null);
   
   const healthComponent = new HealthComponent(25);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);

   const turretComponent = new TurretComponent(SLING_TURRET_SHOT_COOLDOWN_TICKS + SLING_TURRET_RELOAD_TIME_TICKS);
   
   const aiHelperComponent = new AIHelperComponent(400);

   const slingTurretComponent = new SlingTurretComponent();
   
   return {
      entityType: EntityType.slingTurret,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.turret]: turretComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.slingTurret]: slingTurretComponent
      },
      lights: []
   };
}