import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { customTickIntervalHasPassed } from "../../../../shared/src/utils";
import { createPaperParticle } from "../../particles";
import { getEntityAgeTicks } from "../../world";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";
import { TransformComponentArray, getRandomPointInEntity } from "./TransformComponent";

export interface ResearchBenchComponentParams {
   readonly isOccupied: boolean;
}

export interface ResearchBenchComponent {
   isOccupied: boolean;
}

export const ResearchBenchComponentArray = new ServerComponentArray<ResearchBenchComponent, ResearchBenchComponentParams, never>(ServerComponentType.researchBench, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): ResearchBenchComponentParams {
   const isOccupied = reader.readBoolean();
   reader.padOffset(3);

   return {
      isOccupied: isOccupied
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.researchBench>): ResearchBenchComponent {
   return {
      isOccupied: entityConfig.components[ServerComponentType.researchBench].isOccupied
   };
}

function onTick(researchBenchComponent: ResearchBenchComponent, entity: EntityID): void {
   if (researchBenchComponent.isOccupied && customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.3)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const pos = getRandomPointInEntity(transformComponent);
      createPaperParticle(pos.x, pos.y);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(entity);
   researchBenchComponent.isOccupied = reader.readBoolean();
   reader.padOffset(3);
}