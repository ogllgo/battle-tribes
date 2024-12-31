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

export interface BerryBushPlantedComponentParams {
   readonly growthProgress: number;
   readonly numFruits: number;
}

interface RenderParts {
   readonly renderPart: TexturedRenderPart;
}

export interface BerryBushPlantedComponent {
   readonly renderPart: TexturedRenderPart;
}

const TEXTURE_SOURCES = ["entities/plant/berry-bush-sapling-1.png", "entities/plant/berry-bush-sapling-2.png", "entities/plant/berry-bush-sapling-3.png", "entities/plant/berry-bush-sapling-4.png", "entities/plant/berry-bush-sapling-5.png", "entities/plant/berry-bush-sapling-6.png", "entities/plant/berry-bush-sapling-7.png", "entities/plant/berry-bush-sapling-8.png", "entities/plant/berry-bush-sapling-9.png", ""];

const FULLY_GROWN_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "entities/plant/berry-bush-plant-1.png",
   "entities/plant/berry-bush-plant-2.png",
   "entities/plant/berry-bush-plant-3.png",
   "entities/plant/berry-bush-plant-4.png",
   "entities/plant/berry-bush-plant-5.png"
];

export const BerryBushPlantedComponentArray = new ServerComponentArray<BerryBushPlantedComponent, BerryBushPlantedComponentParams, RenderParts>(ServerComponentType.berryBushPlanted, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

const getTextureSource = (growthProgress: number, numFruits: number): string => {
   if (growthProgress < 1) {
      const idx = Math.floor(growthProgress * (TEXTURE_SOURCES.length - 1))
      return TEXTURE_SOURCES[idx];
   } else {
      // @Cleanup
      const maxNumFruits = 4;
      
      const progress = numFruits / maxNumFruits;
      const idx = Math.floor(progress * (FULLY_GROWN_TEXTURE_SOURCES.length - 1))
      return FULLY_GROWN_TEXTURE_SOURCES[idx];
   }
}

function createParamsFromData(reader: PacketReader): BerryBushPlantedComponentParams {
   const growthProgress = reader.readNumber();
   const numFruits = reader.readNumber();
   return {
      growthProgress: growthProgress,
      numFruits: numFruits
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.berryBushPlanted, never>): RenderParts {
   const berryBushPlantedComponentParams = entityConfig.serverComponents[ServerComponentType.berryBushPlanted];
   
   const renderPart = new TexturedRenderPart(
      null,
      // @Cleanup: why is this 9 instead of 0?
      9,
      0,
      getTextureArrayIndex(getTextureSource(berryBushPlantedComponentParams.growthProgress, berryBushPlantedComponentParams.numFruits))
   );
   renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(_entityConfig: EntityConfig<never, never>, renderParts: RenderParts): BerryBushPlantedComponent {
   return {
      renderPart: renderParts.renderPart
   };
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);
   
   const growthProgress = reader.readNumber();
   const numFruits = reader.readNumber();
   berryBushPlantedComponent.renderPart.switchTextureSource(getTextureSource(growthProgress, numFruits));
}

function onHit(entity: Entity): void {
   // @Incomplete: particles?
   playSoundOnEntity("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity);
}

function onDie(entity: Entity): void {
   // @Incomplete: particles?
   playSoundOnEntity("berry-bush-destroy-1.mp3", 0.4, 1, entity);
}