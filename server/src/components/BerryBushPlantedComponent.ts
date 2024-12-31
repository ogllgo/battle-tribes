import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { dropBerryOverEntity } from "./BerryBushComponent";
import { ComponentArray } from "./ComponentArray";
import { getPlantGrowthSpeed, plantIsFertilised } from "./PlanterBoxComponent";

const enum Vars {
   GROWTH_TIME_TICKS = 60 * Settings.TPS
}

export class BerryBushPlantedComponent {
   public plantGrowthTicks = 0;

   public numFruit = 0;
   public fruitRandomGrowthTicks = 0;
}

export const BerryBushPlantedComponentArray = new ComponentArray<BerryBushPlantedComponent>(ServerComponentType.berryBushPlanted, true, getDataLength, addDataToPacket);
BerryBushPlantedComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
BerryBushPlantedComponentArray.onTakeDamage = onTakeDamage;

function onTick(entity: Entity): void {
   const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);

   berryBushPlantedComponent.plantGrowthTicks += getPlantGrowthSpeed(entity);
   if (berryBushPlantedComponent.plantGrowthTicks > Vars.GROWTH_TIME_TICKS) {
      berryBushPlantedComponent.plantGrowthTicks = Vars.GROWTH_TIME_TICKS;

      if (berryBushPlantedComponent.numFruit < 4) {
         const tickChance = plantIsFertilised(entity) ? 0.45 : 0.3;
         
         // Grow fruit
         if (Math.random() < tickChance / Settings.TPS) {
            berryBushPlantedComponent.fruitRandomGrowthTicks++;
            if (berryBushPlantedComponent.fruitRandomGrowthTicks === 5) {
               berryBushPlantedComponent.numFruit++;
               berryBushPlantedComponent.fruitRandomGrowthTicks = 0;
            }
         }
      }
   }
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);

   const growthProgress = berryBushPlantedComponent.plantGrowthTicks / Vars.GROWTH_TIME_TICKS;
   packet.addNumber(growthProgress);
   packet.addNumber(berryBushPlantedComponent.numFruit);
}

// @Cleanup: can be done in place?
const dropBerryBushCropBerries = (entity: Entity, multiplier: number): void => {
   const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);
   if (berryBushPlantedComponent.numFruit === 0) {
      return;
   }

   for (let i = 0; i < multiplier; i++) {
      dropBerryOverEntity(entity);
   }

   berryBushPlantedComponent.numFruit--;
}

function onTakeDamage(entity: Entity): void {
   const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);

   berryBushPlantedComponent.fruitRandomGrowthTicks = 0;

   if (berryBushPlantedComponent.numFruit > 0) {
      dropBerryBushCropBerries(entity, 1);
   }
}