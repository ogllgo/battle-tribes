import { PlanterBoxPlant, ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { PacketReader } from "../../../../shared/src/packets";
import { randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../Entity";
import { createDirtParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface PlantComponentParams {
   readonly plant: PlanterBoxPlant;
   readonly growthProgress: number;
   readonly numFruits: number;
}

interface RenderParts {
   readonly plantRenderPart: TexturedRenderPart | null;
}

export interface PlantComponent {
   plant: PlanterBoxPlant;
   growthProgress: number;
   
   plantRenderPart: TexturedRenderPart | null;
}

const TEXTURE_SOURCES: Record<PlanterBoxPlant, ReadonlyArray<string>> = {
   [PlanterBoxPlant.tree]: ["entities/plant/tree-sapling-1.png", "entities/plant/tree-sapling-2.png", "entities/plant/tree-sapling-3.png", "entities/plant/tree-sapling-4.png", "entities/plant/tree-sapling-5.png", "entities/plant/tree-sapling-6.png", "entities/plant/tree-sapling-7.png", "entities/plant/tree-sapling-8.png", "entities/plant/tree-sapling-9.png", "entities/plant/tree-sapling-10.png", "entities/plant/tree-sapling-11.png"],
   [PlanterBoxPlant.berryBush]: ["entities/plant/berry-bush-sapling-1.png", "entities/plant/berry-bush-sapling-2.png", "entities/plant/berry-bush-sapling-3.png", "entities/plant/berry-bush-sapling-4.png", "entities/plant/berry-bush-sapling-5.png", "entities/plant/berry-bush-sapling-6.png", "entities/plant/berry-bush-sapling-7.png", "entities/plant/berry-bush-sapling-8.png", "entities/plant/berry-bush-sapling-9.png", ""],
   [PlanterBoxPlant.iceSpikes]: ["entities/plant/ice-spikes-sapling-1.png", "entities/plant/ice-spikes-sapling-2.png", "entities/plant/ice-spikes-sapling-3.png", "entities/plant/ice-spikes-sapling-4.png", "entities/plant/ice-spikes-sapling-5.png", "entities/plant/ice-spikes-sapling-6.png", "entities/plant/ice-spikes-sapling-7.png", "entities/plant/ice-spikes-sapling-8.png", "entities/plant/ice-spikes-sapling-9.png"]
};

const BERRY_BUSH_FULLY_GROWN_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "entities/plant/berry-bush-plant-1.png",
   "entities/plant/berry-bush-plant-2.png",
   "entities/plant/berry-bush-plant-3.png",
   "entities/plant/berry-bush-plant-4.png",
   "entities/plant/berry-bush-plant-5.png"
];

export const SEED_TO_PLANT_RECORD: Partial<Record<ItemType, PlanterBoxPlant>> = {
   [ItemType.seed]: PlanterBoxPlant.tree,
   [ItemType.berry]: PlanterBoxPlant.berryBush,
   [ItemType.frostcicle]: PlanterBoxPlant.iceSpikes
};

const createPlantRenderPart = (textureSource: string): TexturedRenderPart => {
   const renderPart = new TexturedRenderPart(
      null,
      9,
      0,
      getTextureArrayIndex(textureSource)
   );
   return renderPart;
}

export const PlantComponentArray = new ServerComponentArray<PlantComponent, PlantComponentParams, RenderParts>(ServerComponentType.plant, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onSpawn: onSpawn,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): PlantComponentParams {
   const plant = reader.readNumber();
   const growthProgress = reader.readNumber();
   const numFruits = reader.readNumber();

   return {
      plant: plant,
      growthProgress: growthProgress,
      numFruits: numFruits
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.plant>): RenderParts {
   const plantComponentParams = entityConfig.components[ServerComponentType.plant];
   
   const textureSource = getPlantTextureSource(plantComponentParams.plant, plantComponentParams.growthProgress, plantComponentParams.numFruits);
   const renderPart = createPlantRenderPart(textureSource);
   renderInfo.attachRenderThing(renderPart);
   
   return {
      plantRenderPart: renderPart
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.plant>, renderParts: RenderParts): PlantComponent {
   const plantConfig = entityConfig.components[ServerComponentType.plant];
   
   return {
      plant: plantConfig.plant,
      growthProgress: plantConfig.growthProgress,
      plantRenderPart: renderParts.plantRenderPart
   };
}

function onSpawn(_plantComponent: PlantComponent, entity: EntityID): void {
   // Create dirt particles
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < 7; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetMagnitude = randFloat(0, 10);
      const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
      createDirtParticle(x, y, ParticleRenderLayer.high);
   }
}

const getPlantTextureSource = (plant: PlanterBoxPlant, growthProgress: number, numFruits: number): string => {
   let textureSource: string;
   // @Hack
   if (growthProgress < 1 || plant !== PlanterBoxPlant.berryBush) {
      const textureSources = TEXTURE_SOURCES[plant];
      const idx = Math.floor(growthProgress * (textureSources.length - 1))
      textureSource = textureSources[idx];
   } else {
      // @Cleanup
      const maxNumFruits = 4;
      
      const progress = numFruits / maxNumFruits;
      const idx = Math.floor(progress * (BERRY_BUSH_FULLY_GROWN_TEXTURE_SOURCES.length - 1))
      textureSource = BERRY_BUSH_FULLY_GROWN_TEXTURE_SOURCES[idx];
   }

   return textureSource;
}

const updatePlantRenderPart = (plantComponent: PlantComponent, entity: EntityID, numFruits: number): void => {
   if (plantComponent.plant !== null) {
      const textureSource = getPlantTextureSource(plantComponent.plant, plantComponent.growthProgress, numFruits);
      if (plantComponent.plantRenderPart === null) {
         plantComponent.plantRenderPart = createPlantRenderPart(textureSource);

         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderThing(plantComponent.plantRenderPart);
      } else {
         plantComponent.plantRenderPart.switchTextureSource(textureSource);
      }
   } else {
      if (plantComponent.plantRenderPart !== null) {
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.removeRenderPart(plantComponent.plantRenderPart);
         plantComponent.plantRenderPart = null;
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const plantComponent = PlantComponentArray.getComponent(entity);
   
   plantComponent.plant = reader.readNumber();
   plantComponent.growthProgress = reader.readNumber();
   const numFruit = reader.readNumber();
   
   updatePlantRenderPart(plantComponent, entity, numFruit);
}