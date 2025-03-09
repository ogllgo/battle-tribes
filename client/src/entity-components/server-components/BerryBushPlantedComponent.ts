import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { PacketReader } from "../../../../shared/src/packets";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { randInt } from "../../../../shared/src/utils";
import { playSoundOnHitbox } from "../../sound";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../../hitboxes";

export interface BerryBushPlantedComponentParams {
   readonly growthProgress: number;
   readonly numFruits: number;
}

interface IntermediateInfo {
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

export const BerryBushPlantedComponentArray = new ServerComponentArray<BerryBushPlantedComponent, BerryBushPlantedComponentParams, IntermediateInfo>(ServerComponentType.berryBushPlanted, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
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

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const berryBushPlantedComponentParams = entityParams.serverComponentParams[ServerComponentType.berryBushPlanted]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Cleanup: why is this 9 instead of 0?
      9,
      0,
      getTextureArrayIndex(getTextureSource(berryBushPlantedComponentParams.growthProgress, berryBushPlantedComponentParams.numFruits))
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(_entityParams: EntityParams, intermediateInfo: IntermediateInfo): BerryBushPlantedComponent {
   return {
      renderPart: intermediateInfo.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
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
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   // @Incomplete: particles?
   playSoundOnHitbox("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   // @Incomplete: particles?
   playSoundOnHitbox("berry-bush-destroy-1.mp3", 0.4, 1, hitbox, false);
}