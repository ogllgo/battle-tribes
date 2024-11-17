import { Entity, RockSpikeProjectileSize } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityAgeTicks } from "../world";
import { Settings } from "battletribes-shared/settings";
import { randFloat } from "battletribes-shared/utils";

export class RockSpikeComponent {
   public readonly size: RockSpikeProjectileSize;
   public readonly lifetimeTicks = Math.floor(randFloat(3.5, 4.5) * Settings.TPS);
   public readonly frozenYeti: Entity;

   constructor(size: number, frozenYeti: Entity) {
      this.size = size;
      this.frozenYeti = frozenYeti;
   }
}

export const RockSpikeComponentArray = new ComponentArray<RockSpikeComponent>(ServerComponentType.rockSpike, true, getDataLength, addDataToPacket);
RockSpikeComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(rockSpike: Entity): void {
   const rockSpikeComponent = RockSpikeComponentArray.getComponent(rockSpike);
   
   // Remove if past lifetime
   const ageTicks = getEntityAgeTicks(rockSpike);
   if (ageTicks >= rockSpikeComponent.lifetimeTicks) {
      destroyEntity(rockSpike);
   }
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const rockSpikeComponent = RockSpikeComponentArray.getComponent(entity);

   packet.addNumber(rockSpikeComponent.size);
   packet.addNumber(rockSpikeComponent.lifetimeTicks);
}