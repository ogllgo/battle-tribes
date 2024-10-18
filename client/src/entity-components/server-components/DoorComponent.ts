import { ServerComponentType } from "battletribes-shared/components";
import { DoorToggleType, EntityID } from "battletribes-shared/entities";
import { playSound } from "../../sound";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";

export interface DoorComponentParams {
   readonly toggleType: DoorToggleType;
   readonly openProgress: number;
}

export interface DoorComponent {
   toggleType: DoorToggleType;
   openProgress: number;
}

export const DoorComponentArray = new ServerComponentArray<DoorComponent, DoorComponentParams, never>(ServerComponentType.door, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): DoorComponentParams {
   const toggleType = reader.readNumber();
   const openProgress = reader.readNumber();

   return {
      toggleType: toggleType,
      openProgress: openProgress
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.door>): DoorComponent {
   const doorComponentParams = entityConfig.components[ServerComponentType.door];
   
   return {
      toggleType: doorComponentParams.toggleType,
      openProgress: doorComponentParams.openProgress
   };
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const toggleType = reader.readNumber();
   const openProgress = reader.readNumber();
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   const doorComponent = DoorComponentArray.getComponent(entity);

   if (toggleType === DoorToggleType.open && doorComponent.toggleType === DoorToggleType.none) {
      playSound("door-open.mp3", 0.4, 1, transformComponent.position);
   } else if (toggleType === DoorToggleType.close && doorComponent.toggleType === DoorToggleType.none) {
      playSound("door-close.mp3", 0.4, 1, transformComponent.position);
   }

   doorComponent.toggleType = toggleType;
   doorComponent.openProgress = openProgress;
}