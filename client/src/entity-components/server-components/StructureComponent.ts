import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID, EntityType } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { playSound } from "../../sound";
import { getEntityType } from "../../world";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

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

function onSpawn(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   switch (getEntityType(entity)) {
      case EntityType.wall: {
         // @Incomplete: Add sounds for stone+ walls
         playSound("wooden-wall-place.mp3", 0.3, 1, transformComponent.position);
         break;
      }
      case EntityType.barrel: {
         playSound("barrel-place.mp3", 0.4, 1, transformComponent.position);
         break;
      }
      case EntityType.campfire: {
         playSound("wooden-wall-place.mp3", 0.3, 1, transformComponent.position);
         break;
      }
      case EntityType.planterBox: {
         // @Temporary
         playSound("wooden-wall-place.mp3", 0.3, 1, transformComponent.position);
         break;
      }
      case EntityType.floorPunjiSticks:
      case EntityType.wallPunjiSticks:
      case EntityType.floorSpikes:
      case EntityType.wallSpikes: {
         playSound("spike-place.mp3", 0.5, 1, transformComponent.position);
         break;
      }
      case EntityType.researchBench: {
         // @Temporary
         playSound("wooden-wall-place.mp3", 0.3, 1, transformComponent.position);
         break;
      }
      case EntityType.bracings: {
         playSound("wooden-bracings-place.mp3", 0.4, 1, transformComponent.position);
         break;
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const structureComponent = StructureComponentArray.getComponent(entity);

   structureComponent.hasActiveBlueprint = reader.readBoolean();
   reader.padOffset(3);
   structureComponent.connectedSidesBitset = reader.readNumber();
}