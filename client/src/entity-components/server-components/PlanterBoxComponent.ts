import { PlanterBoxPlant, ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { randInt, customTickIntervalHasPassed } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createGrowthParticle } from "../../particles";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo, getEntityAgeTicks } from "../../world";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponent, TransformComponentArray, getRandomPointInEntity } from "./TransformComponent";

export interface PlanterBoxComponentParams {
   readonly plantType: PlanterBoxPlant | -1;
   readonly isFertilised: boolean;
}

interface RenderParts {
   readonly moundRenderPart: RenderPart | null;
}

export interface PlanterBoxComponent {
   moundRenderPart: RenderPart | null;
   
   hasPlant: boolean;
   isFertilised: boolean;
}

const createMoundRenderPart = (plantType: PlanterBoxPlant): TexturedRenderPart => {
   const textureSource = plantType === PlanterBoxPlant.iceSpikes ? "entities/plant/snow-clump.png" : "entities/plant/dirt-clump.png";
   return new TexturedRenderPart(
      null,
      1,
      Math.PI / 2 * randInt(0, 3),
      getTextureArrayIndex(textureSource)
   );
}

export const PlanterBoxComponentArray = new ServerComponentArray<PlanterBoxComponent, PlanterBoxComponentParams, RenderParts>(ServerComponentType.planterBox, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): PlanterBoxComponentParams {
   const plantType = reader.readNumber();
   const isFertilised = reader.readBoolean();
   reader.padOffset(3);

   return {
      plantType: plantType,
      isFertilised: isFertilised
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.planterBox, never>): RenderParts {
   renderInfo.attachRenderThing(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/planter-box/planter-box.png")
      )
   );
   
   const planterBoxComponentParams = entityConfig.serverComponents[ServerComponentType.planterBox];

   let renderPart: TexturedRenderPart | null;
   if (planterBoxComponentParams.plantType !== -1) {
      renderPart = createMoundRenderPart(planterBoxComponentParams.plantType);
      renderInfo.attachRenderThing(renderPart);
   } else {
      renderPart = null;
   }
   
   return {
      moundRenderPart: renderPart
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.planterBox, never>, renderParts: RenderParts): PlanterBoxComponent {
   const planterBoxComponentParams = entityConfig.serverComponents[ServerComponentType.planterBox];
   
   return {
      hasPlant: planterBoxComponentParams.plantType !== -1,
      isFertilised: planterBoxComponentParams.isFertilised,
      moundRenderPart: renderParts.moundRenderPart
   };
}

const createGrowthParticleInEntity = (transformComponent: TransformComponent): void => {
   const pos = getRandomPointInEntity(transformComponent);
   createGrowthParticle(pos.x, pos.y);
}
   
function onTick(entity: EntityID): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   if (planterBoxComponent.isFertilised && customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.35)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      createGrowthParticleInEntity(transformComponent);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   
   const plantType = reader.readNumber();
   const isFertilised = reader.readBoolean();
   reader.padOffset(3);
   
   if (isFertilised && !planterBoxComponent.isFertilised) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      for (let i = 0; i < 25; i++) {
         createGrowthParticleInEntity(transformComponent);
      }

      playSound("fertiliser.mp3", 0.6, 1, transformComponent.position);
   }
   planterBoxComponent.isFertilised = isFertilised;
   
   const hasPlant = plantType !== -1;
   if (hasPlant && planterBoxComponent.hasPlant !== hasPlant) {
      // Plant sound effect
      const transformComponent = TransformComponentArray.getComponent(entity);
      playSound("plant.mp3", 0.4, 1, transformComponent.position);
   }
   planterBoxComponent.hasPlant = hasPlant;

   if (plantType !== -1) {
      if (planterBoxComponent.moundRenderPart === null) {
         planterBoxComponent.moundRenderPart = createMoundRenderPart(plantType);
         
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderThing(planterBoxComponent.moundRenderPart);
      }
   } else if (planterBoxComponent.moundRenderPart !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(planterBoxComponent.moundRenderPart);
      planterBoxComponent.moundRenderPart = null;
   }
}