import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { PacketReader } from "../../../../shared/src/packets";
import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface SnowberryBushComponentParams {
   readonly numBerries: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface SnowberryBushComponent {
   readonly renderPart: TexturedRenderPart;
}

export const SnowberryBushComponentArray = new ServerComponentArray<SnowberryBushComponent, SnowberryBushComponentParams, IntermediateInfo>(ServerComponentType.snowberryBush, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(reader: PacketReader): SnowberryBushComponentParams {
   const numBerries = reader.readNumber();
   return {
      numBerries: numBerries
   };
}

const getTextureSource = (numBerries: number): string => {
   return "entities/snowberry-bush/stage-" + numBerries + ".png";
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const snowberryBushComponentParams = entityParams.serverComponentParams[ServerComponentType.snowberryBush]!;

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(getTextureSource(snowberryBushComponentParams.numBerries))
   )
   renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(_entityParams: EntityParams, intermediateInfo: IntermediateInfo): SnowberryBushComponent {
   return {
      renderPart: intermediateInfo.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, snowberryBush: Entity): void {
   const snowberryBushComponent = SnowberryBushComponentArray.getComponent(snowberryBush);

   const numBerries = reader.readNumber();
   snowberryBushComponent.renderPart.switchTextureSource(getTextureSource(numBerries));
}