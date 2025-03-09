import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType, PlantedEntityType } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { randInt, customTickIntervalHasPassed } from "../../../../shared/src/utils";
import { Hitbox } from "../../hitboxes";
import { createGrowthParticle } from "../../particles";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo, getEntityAgeTicks, EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponent, TransformComponentArray, getRandomPositionInEntity } from "./TransformComponent";

export interface PlanterBoxComponentParams {
   readonly plantedEntityType: PlantedEntityType | -1;
   readonly isFertilised: boolean;
}

interface IntermediateInfo {
   readonly moundRenderPart: VisualRenderPart | null;
}

export interface PlanterBoxComponent {
   moundRenderPart: VisualRenderPart | null;
   
   hasPlant: boolean;
   isFertilised: boolean;
}

const createMoundRenderPart = (plantedEntityType: PlantedEntityType, parentHitbox: Hitbox): TexturedRenderPart => {
   const textureSource = plantedEntityType === EntityType.iceSpikesPlanted ? "entities/plant/snow-clump.png" : "entities/plant/dirt-clump.png";
   return new TexturedRenderPart(
      parentHitbox,
      1,
      Math.PI / 2 * randInt(0, 3),
      getTextureArrayIndex(textureSource)
   );
}

export const PlanterBoxComponentArray = new ServerComponentArray<PlanterBoxComponent, PlanterBoxComponentParams, IntermediateInfo>(ServerComponentType.planterBox, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (plantedEntityType: PlantedEntityType | -1, isFertilised: boolean): PlanterBoxComponentParams => {
   return {
      plantedEntityType: plantedEntityType,
      isFertilised: isFertilised
   };
}

export function createPlanterBoxComponentParams(): PlanterBoxComponentParams {
   return fillParams(-1, false);
}

function createParamsFromData(reader: PacketReader): PlanterBoxComponentParams {
   const plantedEntityType = reader.readNumber();
   const isFertilised = reader.readBoolean();
   reader.padOffset(3);

   return fillParams(plantedEntityType, isFertilised);
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/planter-box/planter-box.png")
      )
   );
   
   const planterBoxComponentParams = entityParams.serverComponentParams[ServerComponentType.planterBox]!;

   let renderPart: TexturedRenderPart | null;
   if (planterBoxComponentParams.plantedEntityType !== -1) {
      renderPart = createMoundRenderPart(planterBoxComponentParams.plantedEntityType, hitbox);
      entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
   } else {
      renderPart = null;
   }
   
   return {
      moundRenderPart: renderPart
   };
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): PlanterBoxComponent {
   const planterBoxComponentParams = entityParams.serverComponentParams[ServerComponentType.planterBox]!;
   
   return {
      hasPlant: planterBoxComponentParams.plantedEntityType !== -1,
      isFertilised: planterBoxComponentParams.isFertilised,
      moundRenderPart: intermediateInfo.moundRenderPart
   };
}

function getMaxRenderParts(): number {
   // Planter box, and mound
   return 2;
}

const createGrowthParticleInEntity = (transformComponent: TransformComponent): void => {
   const pos = getRandomPositionInEntity(transformComponent);
   createGrowthParticle(pos.x, pos.y);
}
   
function onTick(entity: Entity): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   if (planterBoxComponent.isFertilised && customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.35)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      createGrowthParticleInEntity(transformComponent);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   
   const plantType = reader.readNumber();
   const isFertilised = reader.readBoolean();
   reader.padOffset(3);
   
   if (isFertilised && !planterBoxComponent.isFertilised) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      for (let i = 0; i < 25; i++) {
         createGrowthParticleInEntity(transformComponent);
      }

      const hitbox = transformComponent.children[0] as Hitbox;
      playSoundOnHitbox("fertiliser.mp3", 0.6, 1, hitbox, false);
   }
   planterBoxComponent.isFertilised = isFertilised;
   
   const hasPlant = plantType !== -1;
   if (hasPlant && planterBoxComponent.hasPlant !== hasPlant) {
      // Plant sound effect
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.children[0] as Hitbox;
      playSoundOnHitbox("plant.mp3", 0.4, 1, hitbox, false);
   }
   planterBoxComponent.hasPlant = hasPlant;

   if (plantType !== -1) {
      if (planterBoxComponent.moundRenderPart === null) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.children[0] as Hitbox;

         planterBoxComponent.moundRenderPart = createMoundRenderPart(plantType, hitbox);
         
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(planterBoxComponent.moundRenderPart);
      }
   } else if (planterBoxComponent.moundRenderPart !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(planterBoxComponent.moundRenderPart);
      planterBoxComponent.moundRenderPart = null;
   }
}