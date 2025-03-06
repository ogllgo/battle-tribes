import { PacketReader } from "battletribes-shared/packets";
import { DecorationType } from "battletribes-shared/components";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { Entity } from "../../../../shared/src/entities";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";

export interface DecorationComponentParams {
   readonly decorationType: DecorationType;
}

interface IntermediateInfo {}

export interface DecorationComponent {
   decorationType: DecorationType;
}

const DECORATION_RENDER_INFO: Record<DecorationType, string> = {
   [DecorationType.pebble]: "decorations/pebble.png",
   [DecorationType.rock]: "decorations/rock1.png",
   [DecorationType.sandstoneRock]: "decorations/sandstone-rock.png",
   [DecorationType.sandstoneRockBig1]: "decorations/sandstone-rock-big1.png",
   [DecorationType.sandstoneRockBig2]: "decorations/sandstone-rock-big2.png",
   [DecorationType.blackRockSmall]: "decorations/black-rock-small.png",
   [DecorationType.blackRock]: "decorations/black-rock.png",
   [DecorationType.snowPile]: "decorations/snow-pile.png",
   [DecorationType.flower1]: "decorations/flower1.png",
   [DecorationType.flower2]: "decorations/flower2.png",
   [DecorationType.flower3]: "decorations/flower3.png",
   [DecorationType.flower4]: "decorations/flower4.png"
};

export const DecorationComponentArray = new ServerComponentArray<DecorationComponent, DecorationComponentParams, IntermediateInfo>(ServerComponentType.decoration, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): DecorationComponentParams {
   const decorationType = reader.readNumber();

   return {
      decorationType: decorationType
   };
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const decorationComponentParams = entityParams.serverComponentParams[ServerComponentType.decoration]!;
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(DECORATION_RENDER_INFO[decorationComponentParams.decorationType])
      )
   );

   return {};
}

function createComponent(entityParams: EntityParams): DecorationComponent {
   return {
      decorationType: entityParams.serverComponentParams[ServerComponentType.decoration]!.decorationType
   };
}

function getMaxRenderParts(): number {
   return 1;
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const decorationComponent = DecorationComponentArray.getComponent(entity);
   decorationComponent.decorationType = reader.readNumber();
}