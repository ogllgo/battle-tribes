import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { ComponentArray } from "./ComponentArray";

export class HungerComponent {
   /** Units of energy that the creature can store */
   public readonly energyCapacity: number;
   /** Number of energy units expended by the creature per second */
   public readonly metabolism: number;

   public energy: number;
   
   constructor(energyCapacity: number, metabolism: number) {
      this.energyCapacity = energyCapacity;
      this.energy = energyCapacity;
      this.metabolism = metabolism;
   }
}

export const HungerComponentArray = new ComponentArray<HungerComponent>(ServerComponentType.hunger, true, getDataLength, addDataToPacket);
HungerComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(entity: Entity): void {
   const hungerComponent = HungerComponentArray.getComponent(entity);
   hungerComponent.energy -= hungerComponent.metabolism / Settings.TPS * 60;
   // @Incomplete: make the entity take damage or something?
   if (hungerComponent.energy < 0) {
      hungerComponent.energy = 0;
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

export function getEntityFullness(entity: Entity): number {
   if (!HungerComponentArray.hasComponent(entity)) {
      throw new Error();
   }

   const hungerComponent = HungerComponentArray.getComponent(entity);
   return hungerComponent.energy / hungerComponent.energyCapacity;
}

export function addHungerEnergy(entity: Entity, energy: number): void {
   if (!HungerComponentArray.hasComponent(entity)) {
      throw new Error();
   }

   const hungerComponent = HungerComponentArray.getComponent(entity);
   hungerComponent.energy += energy;
   if (hungerComponent.energy > hungerComponent.energyCapacity) {
      hungerComponent.energy = hungerComponent.energyCapacity;
   }
}