import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface MossComponentParams {
   readonly size: number;
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
   return {
      size: size
   };
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const mossComponentParams = entityParams.serverComponentParams[ServerComponentType.moss]!;

   let textureSource: string;
   switch (mossComponentParams.size) {
      case 0: textureSource = "entities/moss/moss-small.png"; break;
      case 1: textureSource = "entities/moss/moss-medium.png"; break;
      case 2: textureSource = "entities/moss/moss-large.png"; break;
      default: throw new Error();
   }

   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(textureSource)
      )
   );

   return {};
}

function createComponent(): MossComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   padData(reader);
}