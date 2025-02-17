import { ServerComponentType } from "battletribes-shared/components";
import { DoorToggleType, Entity } from "battletribes-shared/entities";
import { playSoundOnEntity } from "../../sound";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { DOOR_TEXTURE_SOURCES } from "./BuildingMaterialComponent";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../../particles";
import { EntityConfig } from "../ComponentArray";

export interface DoorComponentParams {
   readonly toggleType: DoorToggleType;
   readonly openProgress: number;
}

interface RenderParts {}

export interface DoorComponent {
   toggleType: DoorToggleType;
   openProgress: number;
}

export const DoorComponentArray = new ServerComponentArray<DoorComponent, DoorComponentParams, RenderParts>(ServerComponentType.door, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): DoorComponentParams {
   const toggleType = reader.readNumber();
   const openProgress = reader.readNumber();

   return {
      toggleType: toggleType,
      openProgress: openProgress
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.buildingMaterial, never>): RenderParts {
   const buildingMaterialComponentParams = entityConfig.serverComponents[ServerComponentType.buildingMaterial];

   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(DOOR_TEXTURE_SOURCES[buildingMaterialComponentParams.material])
   );
   renderPart.addTag("buildingMaterialComponent:material");

   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.door, never>): DoorComponent {
   const doorComponentParams = entityConfig.serverComponents[ServerComponentType.door];
   
   return {
      toggleType: doorComponentParams.toggleType,
      openProgress: doorComponentParams.openProgress
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const toggleType = reader.readNumber();
   const openProgress = reader.readNumber();
   
   const doorComponent = DoorComponentArray.getComponent(entity);
   if (toggleType === DoorToggleType.open && doorComponent.toggleType === DoorToggleType.none) {
      playSoundOnEntity("door-open.mp3", 0.4, 1, entity, false);
   } else if (toggleType === DoorToggleType.close && doorComponent.toggleType === DoorToggleType.none) {
      playSoundOnEntity("door-close.mp3", 0.4, 1, entity, false);
   }

   doorComponent.toggleType = toggleType;
   doorComponent.openProgress = openProgress;
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   playSoundOnEntity("wooden-wall-hit.mp3", 0.3, 1, entity, false);

   for (let i = 0; i < 4; i++) {
      createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 20);
   }

   for (let i = 0; i < 7; i++) {
      const position = transformComponent.position.offset(20, 2 * Math.PI * Math.random());
      createLightWoodSpeckParticle(position.x, position.y, 5);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   playSoundOnEntity("wooden-wall-break.mp3", 0.4, 1, entity, false);

   for (let i = 0; i < 7; i++) {
      createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 32 * Math.random());
   }

   for (let i = 0; i < 3; i++) {
      createWoodShardParticle(transformComponent.position.x, transformComponent.position.y, 32);
   }
}