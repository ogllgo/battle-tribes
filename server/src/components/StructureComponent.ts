import { calculateRelativeOffsetDirection, createStructureConnection, StructureConnection, StructureType } from "battletribes-shared/structures";
import { createStructureGrassBlockers } from "../grass-blockers";
import { BlueprintComponentArray } from "./BlueprintComponent";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity } from "battletribes-shared/entities";
import { TribeComponentArray } from "./TribeComponent";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityLayer, getEntityType } from "../world";
import { createVirtualStructureFromHitboxes, VirtualStructure } from "../tribesman-ai/building-plans/TribeBuildingLayer";
import { registerDirtyEntity } from "../server/player-clients";

export class StructureComponent {
   /** The blueprint currently placed on the structure. 0 if none is present */
   public activeBlueprint = 0;

   public readonly connections = new Array<StructureConnection>();

   /** The virtual building associated with the structure. If null, will automatically create a virtual building for the structure. */
   public virtualBuilding: VirtualStructure | null;

   constructor(connections: Array<StructureConnection>, virtualBuilding: VirtualStructure | null) {
      this.connections = connections;
      this.virtualBuilding = virtualBuilding;
   }
}

export const StructureComponentArray = new ComponentArray<StructureComponent>(ServerComponentType.structure, true, getDataLength, addDataToPacket);
StructureComponentArray.onJoin = onJoin;
StructureComponentArray.onRemove = onRemove;

const addConnection = (entity: Entity, structureComponent: StructureComponent, connectedEntity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const connectedEntityTransformComponent = TransformComponentArray.getComponent(connectedEntity);
   
   const relativeOffsetDirection = calculateRelativeOffsetDirection(transformComponent.position, transformComponent.rotation, connectedEntityTransformComponent.position);
   const connection = createStructureConnection(connectedEntity, relativeOffsetDirection);
   structureComponent.connections.push(connection)

   registerDirtyEntity(entity);
}

const removeConnectionWithStructure = (structureComponent: StructureComponent, connectedStructure: Entity): void => {
   for (let i = 0; i < structureComponent.connections.length; i++) {
      const connection = structureComponent.connections[i];
      if (connection.entity === connectedStructure) {
         structureComponent.connections.splice(i, 1);
         i--;
      }
   }
}

function onJoin(entity: Entity): void {
   const structureComponent = StructureComponentArray.getComponent(entity);
   const tribeComponent = TribeComponentArray.getComponent(entity);

   const layer = getEntityLayer(entity);

   if (structureComponent.virtualBuilding === null) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const entityType = getEntityType(entity) as StructureType;
      const buildingLayer = tribeComponent.tribe.buildingLayers[layer.depth];
      
      structureComponent.virtualBuilding = createVirtualStructureFromHitboxes(buildingLayer, transformComponent.position.copy(), transformComponent.relativeRotation, entityType, transformComponent.hitboxes);
   }
   
   tribeComponent.tribe.addBuilding(entity);

   createStructureGrassBlockers(entity);
   
   // Register connections in any connected structures
   for (const connection of structureComponent.connections) {
      const connectedStructureComponent = StructureComponentArray.getComponent(connection.entity);
      addConnection(connection.entity, connectedStructureComponent, entity);
   }
}

function onRemove(entity: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   tribeComponent.tribe.removeBuilding(entity);

   const structureComponent = StructureComponentArray.getComponent(entity);

   for (const connection of structureComponent.connections) {
      if (StructureComponentArray.hasComponent(connection.entity)) {
         const structureComponent = StructureComponentArray.getComponent(connection.entity);
         removeConnectionWithStructure(structureComponent, entity);
      }
   }

   // Destroy the attached blueprint if it exists
   if (BlueprintComponentArray.hasComponent(structureComponent.activeBlueprint)) {
      destroyEntity(structureComponent.activeBlueprint);
   }
}

function getDataLength(entity: Entity): number {
   const structureComponent = StructureComponentArray.getComponent(entity);
   
   let lengthBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * structureComponent.connections.length;
   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const structureComponent = StructureComponentArray.getComponent(entity);

   packet.addBoolean(BlueprintComponentArray.hasComponent(structureComponent.activeBlueprint));
   packet.padOffset(3);

   packet.addNumber(structureComponent.connections.length);
   for (const connection of structureComponent.connections) {
      packet.addNumber(connection.entity);
      packet.addNumber(connection.relativeOffsetDirection);
   }
}