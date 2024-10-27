import { HitData, HitFlags } from "../../../../shared/src/client-server-types";
import { PlanterBoxPlant, ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { PacketReader } from "../../../../shared/src/packets";
import { angle, randFloat, randInt, randItem } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createDirtParticle, createLeafParticle, createLeafSpeckParticle, createWoodSpeckParticle, LEAF_SPECK_COLOUR_HIGH, LEAF_SPECK_COLOUR_LOW, LeafParticleSize } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { TREE_DESTROY_SOUNDS, TREE_HIT_SOUNDS } from "./TreeComponent";

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
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
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

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.plant, never>): RenderParts {
   const plantComponentParams = entityConfig.serverComponents[ServerComponentType.plant];
   
   const textureSource = getPlantTextureSource(plantComponentParams.plant, plantComponentParams.growthProgress, plantComponentParams.numFruits);
   const renderPart = createPlantRenderPart(textureSource);
   renderInfo.attachRenderThing(renderPart);
   
   return {
      plantRenderPart: renderPart
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.plant, never>, renderParts: RenderParts): PlantComponent {
   const plantConfig = entityConfig.serverComponents[ServerComponentType.plant];
   
   return {
      plant: plantConfig.plant,
      growthProgress: plantConfig.growthProgress,
      plantRenderPart: renderParts.plantRenderPart
   };
}

function onSpawn(entity: EntityID): void {
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

function onHit(entity: EntityID, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const plantComponent = PlantComponentArray.getComponent(entity);

   switch (plantComponent.plant) {
      case PlanterBoxPlant.tree: {
         const radius = Math.floor(plantComponent.growthProgress * 10);
   
         // @Cleanup: copy and paste
         const isDamagingHit = (hitData.flags & HitFlags.NON_DAMAGING_HIT) === 0;
         
         // Create leaf particles
         {
            const moveDirection = 2 * Math.PI * Math.random();
   
            const spawnPositionX = transformComponent.position.x + radius * Math.sin(moveDirection);
            const spawnPositionY = transformComponent.position.y + radius * Math.cos(moveDirection);
   
            createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
         }
         
         // Create leaf specks
         const numSpecks = Math.floor(plantComponent.growthProgress * 7) + 2;
         for (let i = 0; i < numSpecks; i++) {
            createLeafSpeckParticle(transformComponent.position.x, transformComponent.position.y, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
         }
   
         if (isDamagingHit) {
            // Create wood specks at the point of hit

            let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
            offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

            const spawnPositionX = transformComponent.position.x + (radius + 2) * Math.sin(offsetDirection);
            const spawnPositionY = transformComponent.position.y + (radius + 2) * Math.cos(offsetDirection);
            for (let i = 0; i < 4; i++) {
               createWoodSpeckParticle(spawnPositionX, spawnPositionY, 3);
            }
            
            playSound(randItem(TREE_HIT_SOUNDS), 0.4, 1, transformComponent.position);
         } else {
            // @Temporary
            playSound("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
         }
         break;
      }
      case PlanterBoxPlant.berryBush: {
         playSound("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
         break;
      }
      case PlanterBoxPlant.iceSpikes: {
         playSound("ice-spikes-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
         break;
      }
   }
}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const plantComponent = PlantComponentArray.getComponent(entity);

   switch (plantComponent.plant) {
      case PlanterBoxPlant.tree: {
         playSound(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, transformComponent.position);
         break;
      }
      case PlanterBoxPlant.berryBush: {
         playSound("berry-bush-destroy-1.mp3", 0.4, 1, transformComponent.position);
         break;
      }
      case PlanterBoxPlant.iceSpikes: {
         playSound("ice-spikes-destroy.mp3", 0.4, 1, transformComponent.position);
         break;
      }
   }
}