import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface MossComponentParams {
   readonly size: number;
   readonly colour: number;
}

interface IntermediateInfo {}

export interface MossComponent {}

export const MossComponentArray = new ServerComponentArray<MossComponent, MossComponentParams, IntermediateInfo>(ServerComponentType.moss, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): MossComponentParams {
   const size = reader.readNumber();
   const colour = reader.readNumber();
   return {
      size: size,
      colour: colour
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const mossComponentParams = entityParams.serverComponentParams[ServerComponentType.moss]!;

   let colourString: string;
   switch (mossComponentParams.colour) {
      case 0: colourString = "light-green"; break;
      case 1: colourString = "dark-green"; break;
      case 2: colourString = "aqua"; break;
      case 3: colourString = "red"; break;
      case 4: colourString = "purple"; break;
      case 5: colourString = "gold"; break;
      default: throw new Error();
   }
   
   let textureSource: string;
   switch (mossComponentParams.size) {
      case 0: textureSource = "entities/moss/" + colourString + "/moss-small.png"; break;
      case 1: textureSource = "entities/moss/" + colourString + "/moss-medium.png"; break;
      case 2: textureSource = "entities/moss/" + colourString + "/moss-large.png"; break;
      default: throw new Error();
   }

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(textureSource)
   );
   renderPart.tintR = randFloat(-0.04, 0.04);
   renderPart.tintG = randFloat(-0.04, 0.04);
   renderPart.tintB = randFloat(-0.04, 0.04);
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): MossComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   padData(reader);
}