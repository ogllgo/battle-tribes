import { TreeSize } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";

export interface TreeComponentParams {
   readonly treeSize: TreeSize;
}

export interface TreeComponent {
   readonly treeSize: TreeSize;
}

export const TreeComponentArray = new ServerComponentArray<TreeComponent, TreeComponentParams, never>(ServerComponentType.tree, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): TreeComponentParams {
   const treeSize = reader.readNumber();
   return {
      treeSize: treeSize
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.tree>): TreeComponent {
   return {
      treeSize: entityConfig.components[ServerComponentType.tree].treeSize
   };
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}