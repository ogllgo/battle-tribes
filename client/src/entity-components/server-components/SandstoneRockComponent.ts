import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface SandstoneRockComponentParams {
   readonly size: number;
}

interface IntermediateInfo {}

export interface SandstoneRockComponent {}

export const SandstoneRockComponentArray = new ServerComponentArray<SandstoneRockComponent, SandstoneRockComponentParams, IntermediateInfo>(ServerComponentType.sandstoneRock, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(reader: PacketReader): SandstoneRockComponentParams {
   const size = reader.readNumber();
   return {
      size: size
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const sandstoneRockComponentParams = entityParams.serverComponentParams[ServerComponentType.sandstoneRock]!;

   let typeString: string;
   switch (sandstoneRockComponentParams.size) {
      case 0: typeString = "small"; break;
      case 1: typeString = "medium"; break;
      case 2: typeString = "large"; break;
      default: throw new Error();
   }
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/sandstone-rock/sandstone-rock-" + typeString + ".png")
      )
   );

   return {};
}

function createComponent(): SandstoneRockComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   padData(reader);
}