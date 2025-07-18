import { ServerComponentType } from "battletribes-shared/components";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams, getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { Entity } from "../../../../shared/src/entities";
import { RenderPart } from "../../render-parts/render-parts";
import { assert } from "../../../../shared/src/utils";
import { StructureConnection } from "../../structure-placement";
import { Hitbox } from "../../hitboxes";
import { TransformComponentArray } from "./TransformComponent";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface FenceComponentParams {}

interface IntermediateInfo {
   readonly connectingRenderParts: Partial<Record<Entity, RenderPart>>;
}

export interface FenceComponent {
   /** For each connecting entity, stores the associated connecting render part */
   readonly connectingRenderParts: Partial<Record<Entity, RenderPart>>;
}

export const FenceComponentArray = new ServerComponentArray<FenceComponent, FenceComponentParams, IntermediateInfo>(ServerComponentType.fence, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (): FenceComponentParams => {
   return {};
}

export function createFenceComponentParams(): FenceComponentParams {
   return fillParams();
}

function createParamsFromData(): FenceComponentParams {
   return fillParams();
}

const createConnectingRenderPart = (connection: StructureConnection, parentHitbox: Hitbox): RenderPart => {
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
      parentHitbox,
      0,
      relativeOffsetDirection,
      getTextureArrayIndex("entities/fence/fence-top-rail.png")
   );
   renderPart.offset.x = offsetMagnitude * Math.sin(relativeOffsetDirection);
   renderPart.offset.y = offsetMagnitude * Math.cos(relativeOffsetDirection);
   
   return renderPart;
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponent = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponent.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         1,
         0,
         getTextureArrayIndex("entities/fence/fence-node.png")
      )
   );

   const connectingRenderParts: Record<Entity, RenderPart> = {};

   // Create initial connecting render parts
   const structureComponentParams = entityParams.serverComponentParams[ServerComponentType.structure]!;
   for (const connection of structureComponentParams.connections) {
      const renderPart = createConnectingRenderPart(connection, hitbox);
      renderInfo.attachRenderPart(renderPart);
      connectingRenderParts[connection.entity] = renderPart;
   }

   return {
      connectingRenderParts: connectingRenderParts,
   };
}

function createComponent(_entityParams: EntityParams, intermediateInfo: IntermediateInfo): FenceComponent {
   return {
      connectingRenderParts: intermediateInfo.connectingRenderParts
   };
}

function getMaxRenderParts(): number {
   // Fence node plus 4 connections
   return 5;
}

function padData(): void {}

function updateFromData(): void {}

export function addFenceConnection(fence: Entity, connection: StructureConnection): void {
   const transformComponent = TransformComponentArray.getComponent(fence);
   const hitbox = transformComponent.hitboxes[0];
   
   const fenceComponent = FenceComponentArray.getComponent(fence);

   const renderInfo = getEntityRenderInfo(fence);
   
   const renderPart = createConnectingRenderPart(connection, hitbox);
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