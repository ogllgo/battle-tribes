import { angle, lerp } from "battletribes-shared/utils";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";
import { RenderPart } from "../../render-parts/render-parts";

export interface FenceGateComponentParams {
   readonly openProgress: number;
}

interface RenderParts {
   readonly doorRenderPart: RenderPart;
}

export interface FenceGateComponent {
   readonly doorRenderPart: RenderPart;

   openProgress: number;
}

interface DoorInfo {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
}

const doorWidth = 52;
const doorHeight = 16;

const doorHalfDiagonalLength = Math.sqrt(doorHeight * doorHeight + doorWidth * doorWidth) / 2;
const angleToCenter = angle(doorHeight, doorWidth);

const getFenceGateDoorInfo = (openProgress: number): DoorInfo => {
   const baseRotation = Math.PI/2;
   const rotation = baseRotation - lerp(0, Math.PI/2 - 0.1, openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = rotation + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(baseRotation + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(baseRotation + angleToCenter);

   return {
      offsetX: xOffset,
      offsetY: yOffset,
      rotation: rotation - Math.PI/2
   };
}

export const FenceGateComponentArray = new ServerComponentArray<FenceGateComponent, FenceGateComponentParams, RenderParts>(ServerComponentType.fenceGate, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): FenceGateComponentParams {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   const openProgress = reader.readNumber();

   return {
      openProgress: openProgress
   };
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("entities/fence-gate/fence-gate-sides.png")
      )
   );

   const doorRenderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex("entities/fence-gate/fence-gate-door.png")
   );
   renderInfo.attachRenderPart(doorRenderPart);

   return {
      doorRenderPart: doorRenderPart
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.fenceGate, never>, renderParts: RenderParts): FenceGateComponent {
   return {
      doorRenderPart: renderParts.doorRenderPart,
      openProgress: entityConfig.serverComponents[ServerComponentType.fenceGate].openProgress
   };
}

function getMaxRenderParts(): number {
   return 2;
}

const updateDoor = (fenceGateComponent: FenceGateComponent): void => {
   const doorInfo = getFenceGateDoorInfo(fenceGateComponent.openProgress);

   fenceGateComponent.doorRenderPart.offset.x = doorInfo.offsetX;
   fenceGateComponent.doorRenderPart.offset.y = doorInfo.offsetY;
   fenceGateComponent.doorRenderPart.rotation = doorInfo.rotation;
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const fenceGateComponent = FenceGateComponentArray.getComponent(entity);
   
   // @Incomplete?
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   fenceGateComponent.openProgress = reader.readNumber();
   
   updateDoor(fenceGateComponent);
}