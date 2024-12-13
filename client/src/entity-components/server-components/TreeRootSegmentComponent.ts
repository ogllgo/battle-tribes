import { ServerComponentType } from "../../../../shared/src/components";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";

export interface TreeRootSegmentComponentParams {
   readonly variation: number;
}

interface RenderParts {}

export interface TreeRootSegmentComponent {}

export const TreeRootSegmentComponentArray = new ServerComponentArray<TreeRootSegmentComponent, TreeRootSegmentComponentParams, RenderParts>(ServerComponentType.treeRootSegment, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(reader: PacketReader): TreeRootSegmentComponentParams {
   const variation = reader.readNumber();
   
   return {
      variation: variation
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.treeRootSegment, never>): RenderParts {
   const treeRootSegmentComponentParams = entityConfig.serverComponents[ServerComponentType.treeRootSegment];
   
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex("entities/tree-root-segment/tree-root-segment-" + (treeRootSegmentComponentParams.variation + 1) + ".png")
   );
   if (Math.random() < 0.5) {
      renderPart.setFlipX(true);
   }
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): TreeRootSegmentComponent {
   return {};
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   padData(reader);
}