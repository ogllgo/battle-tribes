import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { customTickIntervalHasPassed } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createPaperParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityAgeTicks } from "../../world";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray, getRandomPointInEntity } from "./TransformComponent";

export interface ResearchBenchComponentParams {
   readonly isOccupied: boolean;
}

interface RenderParts {}

export interface ResearchBenchComponent {
   isOccupied: boolean;
}

export const ResearchBenchComponentArray = new ServerComponentArray<ResearchBenchComponent, ResearchBenchComponentParams, RenderParts>(ServerComponentType.researchBench, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
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

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderThing(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/research-bench/research-bench.png")
      )
   );

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.researchBench, never>): ResearchBenchComponent {
   return {
      isOccupied: entityConfig.serverComponents[ServerComponentType.researchBench].isOccupied
   };
}

function onTick(entity: EntityID): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(entity);
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