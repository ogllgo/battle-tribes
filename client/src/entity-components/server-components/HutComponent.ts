import { EntityID, EntityType } from "battletribes-shared/entities";
import { Point, lerp } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { ServerComponentType } from "battletribes-shared/components";
import Board from "../../Board";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { playSound } from "../../sound";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { getEntityAgeTicks, getEntityRenderInfo, getEntityType } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { EntityConfig } from "../ComponentArray";

export interface HutComponentParams {
   readonly doorSwingAmount: number;
   readonly isRecalling: boolean;
}

interface RenderParts {
   readonly doorRenderParts: ReadonlyArray<VisualRenderPart>;
   readonly recallMarker: VisualRenderPart | null;
}

export interface HutComponent {
   readonly doorRenderParts: ReadonlyArray<VisualRenderPart>;
   
   // @Memory: Don't need to store
   /** Amount the door should swing outwards from 0 to 1 */
   doorSwingAmount: number;
   isRecalling: boolean;

   recallMarker: VisualRenderPart | null;
}

export const WORKER_HUT_SIZE = 88;
export const WARRIOR_HUT_SIZE = 104;

const DOOR_OPEN_TICKS = Math.floor(0.15 * Settings.TPS);
const DOOR_REMAIN_TICKS = Math.floor(0.175 * Settings.TPS);
const DOOR_CLOSE_TICKS = Math.floor(0.175 * Settings.TPS);

const calculateDoorSwingAmount = (lastDoorSwingTicks: number): number => {
   const ticksSinceLastSwing = Board.serverTicks - lastDoorSwingTicks;
   if (ticksSinceLastSwing <= DOOR_OPEN_TICKS) {
      return lerp(0, 1, ticksSinceLastSwing / DOOR_OPEN_TICKS);
   } else if (ticksSinceLastSwing <= DOOR_OPEN_TICKS + DOOR_REMAIN_TICKS) {
      return 1;
   } else if (ticksSinceLastSwing <= DOOR_OPEN_TICKS + DOOR_REMAIN_TICKS + DOOR_CLOSE_TICKS) {
      return lerp(1, 0, (ticksSinceLastSwing - DOOR_OPEN_TICKS - DOOR_REMAIN_TICKS) / DOOR_CLOSE_TICKS);
   } else {
      return 0;
   }
}

type HutType = EntityType.workerHut | EntityType.warriorHut;

const getHutSize = (hutType: HutType): number => {
   switch (hutType) {
      case EntityType.workerHut: return WORKER_HUT_SIZE;
      case EntityType.warriorHut: return WARRIOR_HUT_SIZE;
   }
}

const getHutDoorHeight = (hutType: HutType): number => {
   switch (hutType) {
      case EntityType.workerHut: return 48;
      case EntityType.warriorHut: return 44;
   }
}

const getDoorXOffset = (hutType: HutType, i: number): number => {
   switch (hutType) {
      case EntityType.workerHut: return -getHutDoorHeight(hutType) / 2;
      case EntityType.warriorHut: return -40 * (i === 0 ? 1 : -1);
   }
}

export const HutComponentArray = new ServerComponentArray<HutComponent, HutComponentParams, RenderParts>(ServerComponentType.hut, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): HutComponentParams {
   const lastDoorSwingTicks = reader.readNumber();
   const isRecalling = reader.readBoolean();
   reader.padOffset(3);

   return {
      doorSwingAmount: lastDoorSwingTicks,
      isRecalling: isRecalling
   };
}

const createRecallMarker = (): TexturedRenderPart => {
   const recallMarker = new TexturedRenderPart(
      null,
      9,
      0,
      getTextureArrayIndex("entities/recall-marker.png")
   );
   recallMarker.inheritParentRotation = false;

   return recallMarker;
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.hut, never>): RenderParts {
   return {
      doorRenderParts: renderInfo.getRenderThings("hutComponent:door") as Array<VisualRenderPart>,
      recallMarker: entityConfig.serverComponents[ServerComponentType.hut].isRecalling ? createRecallMarker() : null
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.hut, never>, renderParts: RenderParts): HutComponent {
   const hutComponentParams = entityConfig.serverComponents[ServerComponentType.hut];
   
   return {
      doorRenderParts: renderParts.doorRenderParts,
      doorSwingAmount: hutComponentParams.doorSwingAmount,
      isRecalling: hutComponentParams.isRecalling,
      recallMarker: renderParts.recallMarker
   };
}

function updateDoors(hutComponent: HutComponent, entity: EntityID): void {
   for (let i = 0; i < hutComponent.doorRenderParts.length; i++) {
      const renderPart = hutComponent.doorRenderParts[i];
      
      const hutType = getEntityType(entity) as HutType;
      const hutSize = getHutSize(hutType);
      const doorHeight = getHutDoorHeight(hutType);
      const doorXOffset = getDoorXOffset(hutType, i);
      
      // @Speed: Garbage collection
      
      const offset = new Point(doorXOffset, hutSize/2);

      const doorRotation = lerp(Math.PI/2, 0, hutComponent.doorSwingAmount) * (i === 0 ? 1 : -1);
      const rotationOffset = new Point(0, doorHeight / 2 - 2).convertToVector();
      rotationOffset.direction = doorRotation;
      offset.add(rotationOffset.convertToPoint());

      renderPart.offset.x = offset.x;
      renderPart.offset.y = offset.y;

      renderPart.rotation = lerp(Math.PI/2, 0, hutComponent.doorSwingAmount) * (i === 0 ? 1 : -1);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const hutComponent = HutComponentArray.getComponent(entity);
   
   const lastDoorSwingTicks = reader.readNumber();
   const isRecalling = reader.readBoolean();
   reader.padOffset(3);

   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // @Incomplete: What if this packet is skipped?
   if (lastDoorSwingTicks === Board.serverTicks) {
      playSound("door-open.mp3", 0.4, 1, transformComponent.position);
   }
   
   hutComponent.isRecalling = isRecalling;
   hutComponent.doorSwingAmount = calculateDoorSwingAmount(lastDoorSwingTicks);
   updateDoors(hutComponent, entity);

   if (hutComponent.isRecalling) {
      if (hutComponent.recallMarker === null) {
         hutComponent.recallMarker = createRecallMarker();
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(hutComponent.recallMarker);
      }

      let opacity = Math.sin(getEntityAgeTicks(entity) / Settings.TPS * 5) * 0.5 + 0.5;
      opacity = lerp(0.3, 1, opacity);
      hutComponent.recallMarker.opacity = lerp(0.3, 0.8, opacity);
   } else {
      if (hutComponent.recallMarker !== null) {
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.removeRenderPart(hutComponent.recallMarker);
         hutComponent.recallMarker = null;
      }
   }
}