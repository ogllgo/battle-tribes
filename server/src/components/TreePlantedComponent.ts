import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { ItemType } from "../../../shared/src/items/items";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { randInt } from "../../../shared/src/utils";
import { createItemsOverEntity } from "../entities/item-entity";
import { ComponentArray } from "./ComponentArray";
import { getPlantGrowthSpeed } from "./PlanterBoxComponent";

const enum Vars {
   GROWTH_TIME_TICKS = 90 * Settings.TPS
}

export class TreePlantedComponent {
   public plantGrowthTicks = 0;
}

export const TreePlantedComponentArray = new ComponentArray<TreePlantedComponent>(ServerComponentType.treePlanted, true, getDataLength, addDataToPacket);
TreePlantedComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
TreePlantedComponentArray.preRemove = preRemove;

export function plantedTreeIsFullyGrown(resource: Entity): boolean {
   const treePlantedComponent = TreePlantedComponentArray.getComponent(resource);
   return treePlantedComponent.plantGrowthTicks === Vars.GROWTH_TIME_TICKS;
}

function onTick(entity: Entity): void {
   const treePlantedComponent = TreePlantedComponentArray.getComponent(entity);

   treePlantedComponent.plantGrowthTicks += getPlantGrowthSpeed(entity);
   if (treePlantedComponent.plantGrowthTicks > Vars.GROWTH_TIME_TICKS) {
      treePlantedComponent.plantGrowthTicks = Vars.GROWTH_TIME_TICKS;
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const treePlantedComponent = TreePlantedComponentArray.getComponent(entity);

   const growthProgress = treePlantedComponent.plantGrowthTicks / Vars.GROWTH_TIME_TICKS;
   packet.addNumber(growthProgress);
}

function preRemove(entity: Entity): void {
   const treePlantedComponent = TreePlantedComponentArray.getComponent(entity);

   // If fully grown, drop wood
   if (treePlantedComponent.plantGrowthTicks === Vars.GROWTH_TIME_TICKS) {
      createItemsOverEntity(entity, ItemType.wood, randInt(2, 4));
      createItemsOverEntity(entity, ItemType.seed, 1);
   }
}