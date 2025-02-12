import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Settings } from "battletribes-shared/settings";
import { Entity, EntityType, PlantedEntityType } from "battletribes-shared/entities";
import { TransformComponentArray } from "./TransformComponent";
import { createEntity } from "../Entity";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, entityExists, getEntityLayer, getEntityType } from "../world";
import { PlantedComponentArray } from "./PlantedComponent";
import { EntityConfig } from "../components";
import { createTreePlantedConfig } from "../entities/resources/tree-planted";
import { createIceSpikesPlantedConfig } from "../entities/resources/ice-spikes-planted";
import { createBerryBushPlantedConfig } from "../entities/resources/berry-bush-planted";

const enum Vars {
   FERTILISER_DURATION_TICKS = 300 * Settings.TPS
}

export class PlanterBoxComponent {
   public plant: Entity | null = null;
   public remainingFertiliserTicks = 0;

   /** Plant entity type that AI tribesman will attempt to place in the planter box */
   public replantEntityType: PlantedEntityType | null = null;
}

export const PlanterBoxComponentArray = new ComponentArray<PlanterBoxComponent>(ServerComponentType.planterBox, true, getDataLength, addDataToComponent);
PlanterBoxComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
PlanterBoxComponentArray.onRemove = onRemove;

function onRemove(entity: Entity): void {
   // When a planter box is destroyed, destroy the plant that was in it
   
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);

   const plant = planterBoxComponent.plant;
   if (plant !== null) {
      destroyEntity(plant);
   }
}

function onTick(entity: Entity): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   if (planterBoxComponent.remainingFertiliserTicks > 0) {
      planterBoxComponent.remainingFertiliserTicks--;
   }
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToComponent(packet: Packet, entity: Entity): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   
   let plantedEntityType = -1;
   if (planterBoxComponent.plant !== null) {
      const plant = planterBoxComponent.plant;
      if (entityExists(plant)) {
         plantedEntityType = getEntityType(plant);
      }
   }

   packet.addNumber(plantedEntityType);
   packet.addBoolean(planterBoxComponent.remainingFertiliserTicks > 0);
   packet.padOffset(3);
}

export function placePlantInPlanterBox(planterBox: Entity, plantedEntityType: PlantedEntityType): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBox);
   const transformComponent = TransformComponentArray.getComponent(planterBox);

   // Create plant
   let config: EntityConfig<ServerComponentType.transform>;
   switch (plantedEntityType) {
      case EntityType.treePlanted: {
         config = createTreePlantedConfig(planterBox);
         break;
      }
      case EntityType.berryBushPlanted: {
         config = createBerryBushPlantedConfig(planterBox);
         break;
      }
      case EntityType.iceSpikesPlanted: {
         config = createIceSpikesPlantedConfig(planterBox);
         break;
      }
   }
   config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
   config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
   config.components[ServerComponentType.transform].relativeRotation = 2 * Math.PI * Math.random();
   const plant = createEntity(config, getEntityLayer(planterBox), 0);

   planterBoxComponent.plant = plant;
   planterBoxComponent.replantEntityType = plantedEntityType;
}

export function fertilisePlanterBox(planterBoxComponent: PlanterBoxComponent): void {
   planterBoxComponent.remainingFertiliserTicks = Vars.FERTILISER_DURATION_TICKS;
}

export function getPlantGrowthSpeed(plant: Entity): number {
   const plantedComponent = PlantedComponentArray.getComponent(plant);

   const planterBoxComponent = PlanterBoxComponentArray.getComponent(plantedComponent.planterBox);
   return planterBoxComponent.remainingFertiliserTicks > 0 ? 1.5 : 1;
}

export function plantIsFertilised(plant: Entity): boolean {
   const plantedComponent = PlantedComponentArray.getComponent(plant);

   const planterBoxComponent = PlanterBoxComponentArray.getComponent(plantedComponent.planterBox);
   return planterBoxComponent.remainingFertiliserTicks > 0;
}