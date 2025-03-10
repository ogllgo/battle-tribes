import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { destroyEntity, getEntityAgeTicks } from "../world";
import { ComponentArray } from "./ComponentArray";

export class FireTorchComponent {}

export const FireTorchComponentArray = new ComponentArray<FireTorchComponent>(ServerComponentType.fireTorch, true, getDataLength, addDataToPacket);
FireTorchComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onTick(entity: Entity): void {
   const age = getEntityAgeTicks(entity);
   if (age >= 15 * Settings.TPS) {
      destroyEntity(entity);
   }
}