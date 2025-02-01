import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { createStructureConnection, StructureConnection } from "../../../../shared/src/structures";
import { playSoundOnEntity } from "../../sound";
import { getEntityType } from "../../world";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";

export interface StructureComponentParams {
   readonly hasActiveBlueprint: boolean;
   readonly connections: Array<StructureConnection>;
}

export interface StructureComponent {
   hasActiveBlueprint: boolean;
   readonly connections: Array<StructureConnection>;
}

export const StructureComponentArray = new ServerComponentArray<StructureComponent, StructureComponentParams, never>(ServerComponentType.structure, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onSpawn: onSpawn,
   padData: padData,
   updateFromData: updateFromData
});

export function createStructureComponentParams(hasActiveBlueprint: boolean, connections: Array<StructureConnection>): StructureComponentParams {
   return {
      hasActiveBlueprint: hasActiveBlueprint,
      connections: connections
   };
}

function createParamsFromData(reader: PacketReader): StructureComponentParams {
   const hasActiveBlueprint = reader.readBoolean();
   reader.padOffset(3);

   const connections = new Array<StructureConnection>();
   const numConnections = reader.readNumber();
   for (let i = 0; i < numConnections; i++) {
      const entity = reader.readNumber() as Entity;

      const connection = createStructureConnection(entity);
      connections.push(connection);
   }

   return createStructureComponentParams(hasActiveBlueprint, connections);
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.structure, never>): StructureComponent {
   const structureComponentParams = entityConfig.serverComponents[ServerComponentType.structure];
   
   return {
      hasActiveBlueprint: structureComponentParams.hasActiveBlueprint,
      connections: structureComponentParams.connections
   };
}

function onSpawn(entity: Entity): void {
   switch (getEntityType(entity)) {
      case EntityType.wall: {
         // @Incomplete: Add sounds for stone+ walls
         playSoundOnEntity("wooden-wall-place.mp3", 0.3, 1, entity, false);
         break;
      }
      case EntityType.barrel: {
         playSoundOnEntity("barrel-place.mp3", 0.4, 1, entity, false);
         break;
      }
      case EntityType.campfire: {
         playSoundOnEntity("wooden-wall-place.mp3", 0.3, 1, entity, false);
         break;
      }
      case EntityType.planterBox: {
         // @Temporary
         playSoundOnEntity("wooden-wall-place.mp3", 0.3, 1, entity, false);
         break;
      }
      case EntityType.floorPunjiSticks:
      case EntityType.wallPunjiSticks:
      case EntityType.floorSpikes:
      case EntityType.wallSpikes: {
         playSoundOnEntity("spike-place.mp3", 0.5, 1, entity, false);
         break;
      }
      case EntityType.researchBench: {
         // @Temporary
         playSoundOnEntity("wooden-wall-place.mp3", 0.3, 1, entity, false);
         break;
      }
      case EntityType.bracings: {
         playSoundOnEntity("wooden-bracings-place.mp3", 0.4, 1, entity, false);
         break;
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

   const numConnections = reader.readNumber();
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT * numConnections);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const structureComponent = StructureComponentArray.getComponent(entity);

   structureComponent.hasActiveBlueprint = reader.readBoolean();
   reader.padOffset(3);

   const newConnectedEntities = new Array<Entity>();
   const numConnections = reader.readNumber();
   for (let i = 0; i < numConnections; i++) {
      const connectedEntity = reader.readNumber();

      newConnectedEntities.push(connectedEntity);

      let alreadyExists = false;
      for (const connection of structureComponent.connections) {
         if (connection.entity === connectedEntity) {
            alreadyExists = true;
            break;
         }
      }

      if (!alreadyExists) {
         const connection = createStructureConnection(connectedEntity);
         structureComponent.connections.push(connection);
      }
   }

   for (let i = 0; i < structureComponent.connections.length; i++) {
      const connection = structureComponent.connections[i];

      let isInNewConnections = false;
      for (const entity of newConnectedEntities) {
         if (connection.entity === entity) {
            isInNewConnections = true;
            break;
         }
      }

      if (!isInNewConnections) {
         structureComponent.connections.splice(i, 1);
         i--;
      }
   }
}