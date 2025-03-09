import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { customTickIntervalHasPassed } from "../../../../shared/src/utils";
import { Hitbox } from "../../hitboxes";
import { createPaperParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams, getEntityAgeTicks } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray, getRandomPositionInEntity } from "./TransformComponent";

export interface ResearchBenchComponentParams {
   readonly isOccupied: boolean;
}

interface IntermediateInfo {}

export interface ResearchBenchComponent {
   isOccupied: boolean;
}

export const ResearchBenchComponentArray = new ServerComponentArray<ResearchBenchComponent, ResearchBenchComponentParams, IntermediateInfo>(ServerComponentType.researchBench, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (isOccupied: boolean): ResearchBenchComponentParams => {
   return {
      isOccupied: isOccupied
   };
}

export function createResearchBenchComponentParams(): ResearchBenchComponentParams {
   return fillParams(false);
}

function createParamsFromData(reader: PacketReader): ResearchBenchComponentParams {
   const isOccupied = reader.readBoolean();
   reader.padOffset(3);

   return fillParams(isOccupied);
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/research-bench/research-bench.png")
      )
   );

   return {};
}

function createComponent(entityParams: EntityParams): ResearchBenchComponent {
   return {
      isOccupied: entityParams.serverComponentParams[ServerComponentType.researchBench]!.isOccupied
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(entity);
   if (researchBenchComponent.isOccupied && customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.3)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const pos = getRandomPositionInEntity(transformComponent);
      createPaperParticle(pos.x, pos.y);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(entity);
   researchBenchComponent.isOccupied = reader.readBoolean();
   reader.padOffset(3);
}