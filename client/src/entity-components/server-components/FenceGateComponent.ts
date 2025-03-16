import { angle, lerp } from "battletribes-shared/utils";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { RenderPart } from "../../render-parts/render-parts";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface FenceGateComponentParams {
   readonly openProgress: number;
}

interface IntermediateInfo {
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

export const FenceGateComponentArray = new ServerComponentArray<FenceGateComponent, FenceGateComponentParams, IntermediateInfo>(ServerComponentType.fenceGate, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (openProgress: number): FenceGateComponentParams => {
   return {
      openProgress: openProgress
   };
}

export function createFenceGateComponentParams(): FenceGateComponentParams {
   return fillParams(0);
}

function createParamsFromData(reader: PacketReader): FenceGateComponentParams {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   const openProgress = reader.readNumber();

   return fillParams(openProgress);
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponent = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponent.children[0] as Hitbox;
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         1,
         0,
         getTextureArrayIndex("entities/fence-gate/fence-gate-sides.png")
      )
   );

   const doorRenderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/fence-gate/fence-gate-door.png")
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(doorRenderPart);

   return {
      doorRenderPart: doorRenderPart
   };
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): FenceGateComponent {
   return {
      doorRenderPart: intermediateInfo.doorRenderPart,
      openProgress: entityParams.serverComponentParams[ServerComponentType.fenceGate]!.openProgress
   };
}

function getMaxRenderParts(): number {
   return 2;
}

const updateDoor = (fenceGateComponent: FenceGateComponent): void => {
   const doorInfo = getFenceGateDoorInfo(fenceGateComponent.openProgress);

   fenceGateComponent.doorRenderPart.offset.x = doorInfo.offsetX;
   fenceGateComponent.doorRenderPart.offset.y = doorInfo.offsetY;
   fenceGateComponent.doorRenderPart.angle = doorInfo.rotation;
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