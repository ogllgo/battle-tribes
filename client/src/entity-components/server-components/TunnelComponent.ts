import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { angle, lerp } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";
import { TUNNEL_TEXTURE_SOURCES } from "./BuildingMaterialComponent";
import { TransformComponent, TransformComponentArray } from "./TransformComponent";

export interface TunnelComponentParams {
   readonly doorBitset: number;
   readonly topDoorOpenProgress: number;
   readonly bottomDoorOpenProgress: number;
}

interface RenderParts {}

export interface TunnelComponent {
   doorBitset: number;
   topDoorOpenProgress: number;
   bottomDoorOpenProgress: number;
   
   readonly doorRenderParts: Record<number, VisualRenderPart>;
}

const doorHalfDiagonalLength = Math.sqrt(16 * 16 + 48 * 48) / 2;
const angleToCenter = angle(16, 48);

export interface TunnelDoorInfo {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
}

const getTunnelDoorInfo = (doorBit: number, openProgress: number): TunnelDoorInfo => {
   const isTopDoor = doorBit === 0b01;

   const baseRotation = isTopDoor ? -Math.PI/2 : Math.PI/2;
   const rotation = baseRotation + lerp(0, Math.PI/2 - 0.1, openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = rotation + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(baseRotation + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(baseRotation + angleToCenter);

   return {
      offsetX: xOffset,
      offsetY: yOffset + (isTopDoor ? 32 : -32),
      rotation: rotation + Math.PI/2
   };
}

export const TunnelComponentArray = new ServerComponentArray<TunnelComponent, TunnelComponentParams, RenderParts>(ServerComponentType.tunnel, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): TunnelComponentParams {
   const doorBitset = reader.readNumber();
   const topDoorOpenProgress = reader.readNumber();
   const bottomDoorOpenProgress = reader.readNumber();

   return {
      doorBitset: doorBitset,
      topDoorOpenProgress: topDoorOpenProgress,
      bottomDoorOpenProgress: bottomDoorOpenProgress
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.buildingMaterial, never>): RenderParts {
   const buildingMaterialComponentParams = entityConfig.serverComponents[ServerComponentType.buildingMaterial];

   const renderPart = new TexturedRenderPart(
      null,
      1,
      0,
      getTextureArrayIndex(TUNNEL_TEXTURE_SOURCES[buildingMaterialComponentParams.material])
   );

   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.tunnel, never>): TunnelComponent {
   const tunnelComponentParams = entityConfig.serverComponents[ServerComponentType.tunnel];
   
   return {
      doorBitset: tunnelComponentParams.doorBitset,
      topDoorOpenProgress: tunnelComponentParams.topDoorOpenProgress,
      bottomDoorOpenProgress: tunnelComponentParams.bottomDoorOpenProgress,
      doorRenderParts: {}
   };
}

const addDoor = (tunnelComponent: TunnelComponent, transformComponent: TransformComponent, entity: Entity, doorBit: number): void => {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      doorBit === 0b10 ? Math.PI : 0,
      getTextureArrayIndex("entities/tunnel/tunnel-door.png")
   );
   renderPart.offset.y = doorBit === 0b10 ? -32 : 32;
   
   tunnelComponent.doorRenderParts[doorBit] = renderPart;

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderPart(renderPart);

   // @Temporary
   playSound("spike-place.mp3", 0.5, 1, transformComponent.position);
}

const updateDoor = (tunnelComponent: TunnelComponent, doorBit: number, openProgress: number): void => {
   const doorInfo = getTunnelDoorInfo(doorBit, openProgress);

   const doorRenderPart = tunnelComponent.doorRenderParts[doorBit];
   doorRenderPart.offset.x = doorInfo.offsetX;
   doorRenderPart.offset.y = doorInfo.offsetY;
   doorRenderPart.rotation = doorInfo.rotation;
}

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const tunnelComponent = TunnelComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const doorBitset = reader.readNumber();
   const topDoorOpenProgress = reader.readNumber();
   const bottomDoorOpenProgress = reader.readNumber();

   if ((doorBitset & 0b01) !== (tunnelComponent.doorBitset & 0b01)) {
      addDoor(tunnelComponent, transformComponent, entity, 0b01);
   }
   if ((doorBitset & 0b10) !== (tunnelComponent.doorBitset & 0b10)) {
      addDoor(tunnelComponent, transformComponent, entity, 0b10);
   }

   // Play open/close sounds
   if ((topDoorOpenProgress > 0 && tunnelComponent.topDoorOpenProgress === 0) || (bottomDoorOpenProgress > 0 && tunnelComponent.bottomDoorOpenProgress === 0)) {
      playSound("door-open.mp3", 0.4, 1, transformComponent.position);
   }
   if ((topDoorOpenProgress < 1 && tunnelComponent.topDoorOpenProgress === 1) || (bottomDoorOpenProgress < 1 && tunnelComponent.bottomDoorOpenProgress === 1)) {
      playSound("door-close.mp3", 0.4, 1, transformComponent.position);
   }
   
   tunnelComponent.doorBitset = doorBitset;
   tunnelComponent.topDoorOpenProgress = topDoorOpenProgress;
   tunnelComponent.bottomDoorOpenProgress = bottomDoorOpenProgress;

   // Update the doors
   if ((tunnelComponent.doorBitset & 0b01) !== 0) {
      updateDoor(tunnelComponent, 0b01, topDoorOpenProgress);
   }
   if ((tunnelComponent.doorBitset & 0b10) !== 0) {
      updateDoor(tunnelComponent, 0b10, bottomDoorOpenProgress);
   }
}