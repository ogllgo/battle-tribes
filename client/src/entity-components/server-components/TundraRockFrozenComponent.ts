import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface TundraRockFrozenComponentParams {
   readonly variant: number;
}

interface IntermediateInfo {}

export interface TundraRockFrozenComponent {
   readonly variant: number;
}

export const TundraRockFrozenComponentArray = new ServerComponentArray<TundraRockFrozenComponent, TundraRockFrozenComponentParams, IntermediateInfo>(ServerComponentType.tundraRockFrozen, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(reader: PacketReader): TundraRockFrozenComponentParams {
   const variant = reader.readNumber();
   return {
      variant: variant
   };
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   const tundraRockFrozenComponentParams = entityParams.serverComponentParams[ServerComponentType.tundraRockFrozen]!;
   
   console.log("A");
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/tundra-rock-frozen/rock-" + (tundraRockFrozenComponentParams.variant + 1) + ".png")
   )
   if (tundraRockFrozenComponentParams.variant === 0) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockFrozenComponentParams.variant === 1) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockFrozenComponentParams.variant === 2) {
      renderPart.angle = -Math.PI * 0.08;
   }
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityParams: EntityParams): TundraRockFrozenComponent {
   return {
      variant: entityParams.serverComponentParams[ServerComponentType.tundraRockFrozen]!.variant
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