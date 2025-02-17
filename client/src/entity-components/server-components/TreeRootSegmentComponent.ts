import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createWoodSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnEntity } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface TreeRootSegmentComponentParams {
   readonly variant: number;
}

interface RenderParts {}

export interface TreeRootSegmentComponent {
   readonly variant: number;
}

export const TreeRootSegmentComponentArray = new ServerComponentArray<TreeRootSegmentComponent, TreeRootSegmentComponentParams, RenderParts>(ServerComponentType.treeRootSegment, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onDie: onDie,
   onHit: onHit
});

function createParamsFromData(reader: PacketReader): TreeRootSegmentComponentParams {
   const variant = reader.readNumber();
   
   return {
      variant: variant
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.treeRootSegment, never>): RenderParts {
   const treeRootSegmentComponentParams = entityConfig.serverComponents[ServerComponentType.treeRootSegment];
   
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex("entities/tree-root-segment/tree-root-segment-" + (treeRootSegmentComponentParams.variant + 1) + ".png")
   );
   if (Math.random() < 0.5) {
      renderPart.setFlipX(true);
   }
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.treeRootSegment, never>): TreeRootSegmentComponent {
   return {
      variant: entityConfig.serverComponents[ServerComponentType.treeRootSegment].variant
   };
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

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 6; i++) {
      createWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 16 * Math.random());
   }

   playSoundOnEntity("tree-root-segment-hit.mp3", randFloat(0.47, 0.53), randFloat(0.9, 1.1), entity, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 10; i++) {
      createWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 16 * Math.random());
   }

   const treeRootSegmentComponent = TreeRootSegmentComponentArray.getComponent(entity);
   playSoundOnEntity("tree-root-segment-death-" + (treeRootSegmentComponent.variant % 3 + 1) + ".mp3", 0.5, 1, entity, false);
}