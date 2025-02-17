import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityConfig } from "../ComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { randInt } from "../../../../shared/src/utils";
import { playSoundOnEntity } from "../../sound";

export interface IceSpikesPlantedComponentParams {
   readonly growthProgress: number;
}

interface RenderParts {
   readonly renderPart: TexturedRenderPart;
}

export interface IceSpikesPlantedComponent {
   readonly renderPart: TexturedRenderPart;
}

const TEXTURE_SOURCES = ["entities/plant/ice-spikes-sapling-1.png", "entities/plant/ice-spikes-sapling-2.png", "entities/plant/ice-spikes-sapling-3.png", "entities/plant/ice-spikes-sapling-4.png", "entities/plant/ice-spikes-sapling-5.png", "entities/plant/ice-spikes-sapling-6.png", "entities/plant/ice-spikes-sapling-7.png", "entities/plant/ice-spikes-sapling-8.png", "entities/plant/ice-spikes-sapling-9.png"];

export const IceSpikesPlantedComponentArray = new ServerComponentArray<IceSpikesPlantedComponent, IceSpikesPlantedComponentParams, RenderParts>(ServerComponentType.iceSpikesPlanted, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

const getTextureSource = (growthProgress: number): string => {
   const idx = Math.floor(growthProgress * (TEXTURE_SOURCES.length - 1))
   return TEXTURE_SOURCES[idx];
}

function createParamsFromData(reader: PacketReader): IceSpikesPlantedComponentParams {
   const growthProgress = reader.readNumber();
   return {
      growthProgress: growthProgress
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.iceSpikesPlanted, never>): RenderParts {
   const iceSpikesPlantedComponentParams = entityConfig.serverComponents[ServerComponentType.iceSpikesPlanted];
   
   const renderPart = new TexturedRenderPart(
      null,
      // @Cleanup: why is this 9 instead of 0?
      9,
      0,
      getTextureArrayIndex(getTextureSource(iceSpikesPlantedComponentParams.growthProgress))
   );
   renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(_entityConfig: EntityConfig<never, never>, renderParts: RenderParts): IceSpikesPlantedComponent {
   return {
      renderPart: renderParts.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const iceSpikesPlantedComponent = IceSpikesPlantedComponentArray.getComponent(entity);
   
   const growthProgress = reader.readNumber();
   iceSpikesPlantedComponent.renderPart.switchTextureSource(getTextureSource(growthProgress));
}

function onHit(entity: Entity): void {
   // @Incomplete: particles?
   playSoundOnEntity("ice-spikes-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, false);
}

function onDie(entity: Entity): void {
   // @Incomplete: particles?
   playSoundOnEntity("ice-spikes-destroy.mp3", 0.4, 1, entity, false);
}