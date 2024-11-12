import { Settings } from "battletribes-shared/settings";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { updateHealthBar } from "../../components/game/HealthBar";
import { discombobulate } from "../../components/game/GameInteractableLayer";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { ComponentTint, createComponentTint } from "../../EntityRenderInfo";
import { getEntityRenderInfo, playerInstance } from "../../world";
import { HitData, HitFlags } from "../../../../shared/src/client-server-types";
import { EntityConfig } from "../ComponentArray";

export interface HealthComponentParams {
   readonly health: number;
   readonly maxHealth: number;
}

export interface HealthComponent {
   health: number;
   maxHealth: number;

   secondsSinceLastHit: number;
}

/** Amount of seconds that the hit flash occurs for */
const ATTACK_HIT_FLASH_DURATION = 0.4;
const MAX_REDNESS = 0.85;

export const HealthComponentArray = new ServerComponentArray<HealthComponent, HealthComponentParams, never>(ServerComponentType.health, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onTick: onTick,
   onHit: onHit,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData,
   calculateTint: calculateTint
});

export function createHealthComponentParams(health: number, maxHealth: number): HealthComponentParams {
   return {
      health: health,
      maxHealth: maxHealth
   };
}

function createParamsFromData(reader: PacketReader): HealthComponentParams {
   const health = reader.readNumber();
   const maxHealth = reader.readNumber();

   return createHealthComponentParams(health, maxHealth);
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.health, never>): HealthComponent {
   const healthComponentParams = entityConfig.serverComponents[ServerComponentType.health];
   
   return {
      health: healthComponentParams.health,
      maxHealth: healthComponentParams.maxHealth,
      // @Hack: ideally should be sent from server
      secondsSinceLastHit: 99999
   };
}

const calculateRedness = (healthComponent: HealthComponent): number => {
   let redness: number;
   if (healthComponent.secondsSinceLastHit === null || healthComponent.secondsSinceLastHit > ATTACK_HIT_FLASH_DURATION) {
      redness = 0;
   } else {
      redness = MAX_REDNESS * (1 - healthComponent.secondsSinceLastHit / ATTACK_HIT_FLASH_DURATION);
   }
   return redness;
}

function onTick(entity: Entity): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
   
   const previousRedness = calculateRedness(healthComponent);
   healthComponent.secondsSinceLastHit += Settings.I_TPS;

   const newRedness = calculateRedness(healthComponent);

   if (newRedness !== previousRedness) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.recalculateTint();
   }
}

function onHit(entity: Entity, hitData: HitData): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
      
   const isDamagingHit = (hitData.flags & HitFlags.NON_DAMAGING_HIT) === 0;
   if (isDamagingHit) {
      healthComponent.secondsSinceLastHit = 0;
   }

   // @Hack
   if (entity === playerInstance) {
      discombobulate(0.2);
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
   
   healthComponent.health = reader.readNumber();
   healthComponent.maxHealth = reader.readNumber();
}

function updatePlayerFromData(reader: PacketReader): void {
   updateFromData(reader, playerInstance!);

   const healthComponent = HealthComponentArray.getComponent(playerInstance!);
   updateHealthBar(healthComponent.health);
}

function calculateTint(entity: Entity): ComponentTint {
   const healthComponent = HealthComponentArray.getComponent(entity);
   const redness = calculateRedness(healthComponent);

   // @Incomplete?
   // const r = lerp(this.entity.tintR, 1, redness);
   // const g = lerp(this.entity.tintG, -1, redness);
   // const b = lerp(this.entity.tintB, -1, redness);
   const r = redness;
   const g = -redness;
   const b = -redness;
   return createComponentTint(r, g, b);
}