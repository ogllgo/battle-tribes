import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { randInt } from "../../../shared/src/utils";
import { getEntityLayer } from "../world";
import { ComponentArray } from "./ComponentArray";
import { createIceShardExplosion } from "./IceSpikesComponent";
import { getPlantGrowthSpeed } from "./PlanterBoxComponent";
import { TransformComponentArray } from "./TransformComponent";

const enum Vars {
   GROWTH_TIME_TICKS = 120 * Settings.TPS
}

export class IceSpikesPlantedComponent {
   public plantGrowthTicks = 0;
}

export const IceSpikesPlantedComponentArray = new ComponentArray<IceSpikesPlantedComponent>(ServerComponentType.iceSpikesPlanted, true, getDataLength, addDataToPacket);
IceSpikesPlantedComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
IceSpikesPlantedComponentArray.preRemove = preRemove;

export function plantedIceSpikesIsFullyGrown(entity: Entity): boolean {
   const iceSpikesPlantedComponent = IceSpikesPlantedComponentArray.getComponent(entity);
   return iceSpikesPlantedComponent.plantGrowthTicks === Vars.GROWTH_TIME_TICKS;
}

function onTick(entity: Entity): void {
   const iceSpikesPlantedComponent = IceSpikesPlantedComponentArray.getComponent(entity);

   iceSpikesPlantedComponent.plantGrowthTicks += getPlantGrowthSpeed(entity);
   if (iceSpikesPlantedComponent.plantGrowthTicks > Vars.GROWTH_TIME_TICKS) {
      iceSpikesPlantedComponent.plantGrowthTicks = Vars.GROWTH_TIME_TICKS;
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const iceSpikesPlantedComponent = IceSpikesPlantedComponentArray.getComponent(entity);

   const growthProgress = iceSpikesPlantedComponent.plantGrowthTicks / Vars.GROWTH_TIME_TICKS;
   packet.addNumber(growthProgress);
}

function preRemove(entity: Entity): void {
   const iceSpikesPlantedComponent = IceSpikesPlantedComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const layer = getEntityLayer(entity);
   if (iceSpikesPlantedComponent.plantGrowthTicks === Vars.GROWTH_TIME_TICKS) {
      createIceShardExplosion(layer, transformComponent.position.x, transformComponent.position.y, randInt(2, 3));
   } else if (iceSpikesPlantedComponent.plantGrowthTicks >= Vars.GROWTH_TIME_TICKS * 0.5) {
      createIceShardExplosion(layer, transformComponent.position.x, transformComponent.position.y, randInt(1, 2));
   }
}