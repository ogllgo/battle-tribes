import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { playSound, playSoundOnEntity } from "../../sound";
import { getEntityType } from "../../world";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";

export interface StructureComponentParams {
   readonly hasActiveBlueprint: boolean;
   readonly connectedSidesBitset: number;
}

export interface StructureComponent {
   hasActiveBlueprint: boolean;
   connectedSidesBitset: number;
}

export const StructureComponentArray = new ServerComponentArray<StructureComponent, StructureComponentParams, never>(ServerComponentType.structure, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onSpawn: onSpawn,
   padData: padData,
   updateFromData: updateFromData
});

export function createStructureComponentParams(hasActiveBlueprint: boolean, connectedSidesBitset: number): StructureComponentParams {
   return {
      hasActiveBlueprint: hasActiveBlueprint,
      connectedSidesBitset: connectedSidesBitset
   };
}

function createParamsFromData(reader: PacketReader): StructureComponentParams {
   const hasActiveBlueprint = reader.readBoolean();
   reader.padOffset(3);
   const connectedSidesBitset = reader.readNumber();

   return createStructureComponentParams(hasActiveBlueprint, connectedSidesBitset);
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.structure, never>): StructureComponent {
   const structureComponentParams = entityConfig.serverComponents[ServerComponentType.structure];
   
   return {
      hasActiveBlueprint: structureComponentParams.hasActiveBlueprint,
      connectedSidesBitset: structureComponentParams.connectedSidesBitset
   };
}

function onSpawn(entity: Entity): void {
   switch (getEntityType(entity)) {
      case EntityType.wall: {
         // @Incomplete: Add sounds for stone+ walls
         playSoundOnEntity("wooden-wall-place.mp3", 0.3, 1, entity);
         break;
      }
      case EntityType.barrel: {
         playSoundOnEntity("barrel-place.mp3", 0.4, 1, entity);
         break;
      }
      case EntityType.campfire: {
         playSoundOnEntity("wooden-wall-place.mp3", 0.3, 1, entity);
         break;
      }
      case EntityType.planterBox: {
         // @Temporary
         playSoundOnEntity("wooden-wall-place.mp3", 0.3, 1, entity);
         break;
      }
      case EntityType.floorPunjiSticks:
      case EntityType.wallPunjiSticks:
      case EntityType.floorSpikes:
      case EntityType.wallSpikes: {
         playSoundOnEntity("spike-place.mp3", 0.5, 1, entity);
         break;
      }
      case EntityType.researchBench: {
         // @Temporary
         playSoundOnEntity("wooden-wall-place.mp3", 0.3, 1, entity);
         break;
      }
      case EntityType.bracings: {
         playSoundOnEntity("wooden-bracings-place.mp3", 0.4, 1, entity);
         break;
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const structureComponent = StructureComponentArray.getComponent(entity);

   structureComponent.hasActiveBlueprint = reader.readBoolean();
   reader.padOffset(3);
   structureComponent.connectedSidesBitset = reader.readNumber();
}