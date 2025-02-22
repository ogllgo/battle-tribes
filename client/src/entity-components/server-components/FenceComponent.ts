import { ServerComponentType } from "battletribes-shared/components";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { Entity } from "../../../../shared/src/entities";
import { RenderPart } from "../../render-parts/render-parts";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { EntityConfig } from "../ComponentArray";
import { StructureConnection } from "../../../../shared/src/structures";
import { TransformComponentArray } from "./TransformComponent";
import { assert, Point } from "../../../../shared/src/utils";

export interface FenceComponentParams {}

interface RenderParts {
   readonly connectingRenderParts: Partial<Record<Entity, RenderPart>>;
}

export interface FenceComponent {
   /** For each connecting entity, stores the associated connecting render part */
   readonly connectingRenderParts: Partial<Record<Entity, RenderPart>>;
}

export const FenceComponentArray = new ServerComponentArray<FenceComponent, FenceComponentParams, RenderParts>(ServerComponentType.fence, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): FenceComponentParams {
   return {};
}

const createConnectingRenderPart = (connection: StructureConnection): RenderPart => {
   const offsetMagnitude = 22;
   const relativeOffsetDirection = connection.relativeOffsetDirection;
   // let textureSource: string;
   // let offsetX: number;
   // let offsetY: number;
   // switch (railBit) {
   //    case 0b0001: {
   //       textureSource = "entities/fence/fence-top-rail.png";
   //       offsetX = 0;
   //       offsetY = 22;
   //       break;
   //    }
   //    case 0b0010: {
   //       textureSource = "entities/fence/fence-right-rail.png";
   //       offsetX = 22;
   //       offsetY = 0;
   //       break;
   //    }
   //    case 0b0100: {
   //       textureSource = "entities/fence/fence-bottom-rail.png";
   //       offsetX = 0;
   //       offsetY = -22;
   //       break;
   //    }
   //    case 0b1000: {
   //       textureSource = "entities/fence/fence-left-rail.png";
   //       offsetX = -22;
   //       offsetY = 0;
   //       break;
   //    }
   // }
   
   const renderPart = new TexturedRenderPart(
      null,
      0,
      relativeOffsetDirection,
      getTextureArrayIndex("entities/fence/fence-top-rail.png")
   );
   renderPart.offset.x = offsetMagnitude * Math.sin(relativeOffsetDirection);
   renderPart.offset.y = offsetMagnitude * Math.cos(relativeOffsetDirection);
   
   return renderPart;
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.transform | ServerComponentType.structure, never>): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("entities/fence/fence-node.png")
      )
   );

   const connectingRenderParts: Record<Entity, RenderPart> = {};

   // Create initial connecting render parts
   const structureComponentParams = entityConfig.serverComponents[ServerComponentType.structure];
   for (const connection of structureComponentParams.connections) {
      const renderPart = createConnectingRenderPart(connection);
      renderInfo.attachRenderPart(renderPart);
      connectingRenderParts[connection.entity] = renderPart;
   }

   return {
      connectingRenderParts: connectingRenderParts,
   };
}

function createComponent(_entityConfig: EntityConfig<never, never>, renderParts: RenderParts): FenceComponent {
   return {
      connectingRenderParts: renderParts.connectingRenderParts
   };
}

function getMaxRenderParts(): number {
   // Fence node plus 4 connections
   return 5;
}

function padData(): void {}

function updateFromData(): void {}

export function addFenceConnection(fence: Entity, connection: StructureConnection): void {
   const fenceComponent = FenceComponentArray.getComponent(fence);

   const renderInfo = getEntityRenderInfo(fence);
   
   const renderPart = createConnectingRenderPart(connection);
   renderInfo.attachRenderPart(renderPart);
   fenceComponent.connectingRenderParts[connection.entity] = renderPart;
}

export function removeFenceConnection(fence: Entity, connection: StructureConnection): void {
   const fenceComponent = FenceComponentArray.getComponent(fence);

   const renderPart = fenceComponent.connectingRenderParts[connection.entity];
   assert(typeof renderPart !== "undefined");

   const renderInfo = getEntityRenderInfo(fence);
   renderInfo.removeRenderPart(renderPart);
   
   delete fenceComponent.connectingRenderParts[connection.entity];
}