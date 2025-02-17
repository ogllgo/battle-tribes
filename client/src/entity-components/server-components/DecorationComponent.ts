import { PacketReader } from "battletribes-shared/packets";
import { DecorationType } from "battletribes-shared/components";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";

export interface DecorationComponentParams {
   readonly decorationType: DecorationType;
}

interface RenderParts {}

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

export const DecorationComponentArray = new ServerComponentArray<DecorationComponent, DecorationComponentParams, RenderParts>(ServerComponentType.decoration, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
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

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.decoration, never>): RenderParts {
   const decorationComponentParams = entityConfig.serverComponents[ServerComponentType.decoration];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(DECORATION_RENDER_INFO[decorationComponentParams.decorationType])
      )
   );

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.decoration, never>): DecorationComponent {
   return {
      decorationType: entityConfig.serverComponents[ServerComponentType.decoration].decorationType
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