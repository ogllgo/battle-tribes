import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { randInt } from "battletribes-shared/utils";
import { playSound } from "../../sound";
import { PacketReader } from "battletribes-shared/packets";
import { EntityID } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";

export interface ZombieComponentParams {
   readonly zombieType: number;
}
   
export interface ZombieComponent {
   readonly zombieType: number;
}

export const ZombieComponentArray = new ServerComponentArray<ZombieComponent, ZombieComponentParams, never>(ServerComponentType.zombie, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): ZombieComponentParams {
   const zombieType = reader.readNumber();
   return {
      zombieType: zombieType
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.zombie>): ZombieComponent {
   return {
      zombieType: entityConfig.components[ServerComponentType.zombie].zombieType
   };
}

function onTick(_zombieComponent: ZombieComponent, entity: EntityID): void {
   if (Math.random() < 0.1 / Settings.TPS) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      playSound("zombie-ambient-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}