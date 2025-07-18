import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface TundraRockComponentParams {
   readonly variant: number;
}

interface IntermediateInfo {}

export interface TundraRockComponent {
   readonly variant: number;
}

export const TundraRockComponentArray = new ServerComponentArray<TundraRockComponent, TundraRockComponentParams, IntermediateInfo>(ServerComponentType.tundraRock, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(reader: PacketReader): TundraRockComponentParams {
   const variant = reader.readNumber();
   return {
      variant: variant
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const tundraRockComponentParams = entityParams.serverComponentParams[ServerComponentType.tundraRock]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/tundra-rock/rock-" + (tundraRockComponentParams.variant + 1) + ".png")
   )
   if (tundraRockComponentParams.variant === 0) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockComponentParams.variant === 1) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockComponentParams.variant === 2) {
      renderPart.angle = -Math.PI * 0.08;
   }
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityParams: EntityParams): TundraRockComponent {
   return {
      variant: entityParams.serverComponentParams[ServerComponentType.tundraRock]!.variant
   };
}

function getMaxRenderParts(): number {
   return 1;
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}