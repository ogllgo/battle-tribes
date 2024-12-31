import { ServerComponentType } from "../../../../shared/src/components";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";

export interface MithrilOreNodeComponentParams {
   readonly size: number;
   readonly variant: number;
   readonly renderHeight: number;
}

interface RenderParts {}

export interface MithrilOreNodeComponent {}

export const MithrilOreNodeComponentArray = new ServerComponentArray<MithrilOreNodeComponent, MithrilOreNodeComponentParams, RenderParts>(ServerComponentType.mithrilOreNode, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(reader: PacketReader): MithrilOreNodeComponentParams {
   const size = reader.readNumber();
   const variant = reader.readNumber();
   const renderHeight = reader.readNumber();
   return {
      size: size,
      variant: variant,
      renderHeight: renderHeight
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.mithrilOreNode, never>): RenderParts {
   const mithrilOreNodeComponentParams = entityConfig.serverComponents[ServerComponentType.mithrilOreNode];
   const size = mithrilOreNodeComponentParams.size;
   const variant = mithrilOreNodeComponentParams.variant;

   let textureSource: string;
   switch (size) {
      case 0: {
         textureSource = "entities/mithril-ore-node/mithril-ore-node-large-" + (variant + 1) + ".png";
         break;
      }
      case 1: {
         textureSource = "entities/mithril-ore-node/mithril-ore-node-medium-" + (variant + 1) + ".png";
         break;
      }
      case 2: {
         textureSource = "entities/mithril-ore-node/mithril-ore-node-small-" + (variant + 1) + ".png";
         break;
      }
      default: {
         throw new Error();
      }
   }
   
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(textureSource)
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): MithrilOreNodeComponent {
   return {};
}

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   padData(reader);
}