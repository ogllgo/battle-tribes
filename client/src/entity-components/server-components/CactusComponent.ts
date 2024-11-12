import { CactusBodyFlowerData, CactusFlowerSize, CactusLimbData, CactusLimbFlowerData, Entity } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { createCactusSpineParticle, createFlowerParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { randInt } from "../../../../shared/src/utils";
import { playSound } from "../../sound";
import { EntityConfig } from "../ComponentArray";

export interface CactusComponentParams {
   readonly flowerData: Array<CactusBodyFlowerData>;
   readonly limbData: Array<CactusLimbData>;
}

interface RenderParts {}

export interface CactusComponent {
   // @Memory: go based off hitboxes/render parts
   readonly flowerData: Array<CactusBodyFlowerData>;
   // @Memory: go based off hitboxes/render parts
   readonly limbData: Array<CactusLimbData>;
}

export const CACTUS_RADIUS = 40;

const getFlowerTextureSource = (type: number, size: CactusFlowerSize): string => {
   if (type === 4) {
      return "entities/cactus/cactus-flower-5.png";
   } else {
      return `entities/cactus/cactus-flower-${size === CactusFlowerSize.small ? "small" : "large"}-${type + 1}.png`;
   }
}

export const CactusComponentArray = new ServerComponentArray<CactusComponent, CactusComponentParams, RenderParts>(ServerComponentType.cactus, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): CactusComponentParams {
   const flowers = new Array<CactusBodyFlowerData>();
   const numFlowers = reader.readNumber();
   for (let i = 0; i < numFlowers; i++) {
      const flowerType = reader.readNumber();
      const height = reader.readNumber();
      const rotation = reader.readNumber();
      const size = reader.readNumber();
      const column = reader.readNumber();

      const flower: CactusBodyFlowerData = {
         type: flowerType,
         height: height,
         rotation: rotation,
         size: size,
         column: column
      };
      flowers.push(flower);
   }

   const limbs = new Array<CactusLimbData>();
   const numLimbs = reader.readNumber();
   for (let i = 0; i < numLimbs; i++) {
      const limbDirection = reader.readNumber();
      const hasFlower = reader.readBoolean();
      reader.padOffset(3);

      let flower: CactusLimbFlowerData | undefined;
      if (hasFlower) {
         const type = reader.readNumber();
         const height = reader.readNumber();
         const rotation = reader.readNumber();
         const direction = reader.readNumber();
         
         flower = {
            type: type,
            height: height,
            rotation: rotation,
            direction: direction
         };
      }

      const limbData: CactusLimbData = {
         direction: limbDirection,
         flower: flower
      };
      limbs.push(limbData);
   }

   return {
      flowerData: flowers,
      limbData: limbs
   };
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   const baseRenderPart = new TexturedRenderPart(
      null,
      2,
      0,
      getTextureArrayIndex("entities/cactus/cactus.png")
   );
   renderInfo.attachRenderPart(baseRenderPart);

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.cactus, never>): CactusComponent {
   const cactusComponentParams = entityConfig.serverComponents[ServerComponentType.cactus];
   
   return {
      flowerData: cactusComponentParams.flowerData,
      limbData: cactusComponentParams.limbData
   };
}

function padData(reader: PacketReader): void {
   const numFlowers = reader.readNumber();
   reader.padOffset(5 * Float32Array.BYTES_PER_ELEMENT * numFlowers);

   const numLimbs = reader.readNumber();
   for (let i = 0; i < numLimbs; i++) {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      const hasFlower = reader.readBoolean();
      reader.padOffset(3);

      if (hasFlower) {
         reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);
      }
   }
}

// @Garbage
function updateFromData(reader: PacketReader, entity: Entity): void {
   const cactusComponent = CactusComponentArray.getComponent(entity);
   
   const flowers = new Array<CactusBodyFlowerData>();
   const numFlowers = reader.readNumber();
   for (let i = 0; i < numFlowers; i++) {
      const flowerType = reader.readNumber();
      const height = reader.readNumber();
      const rotation = reader.readNumber();
      const size = reader.readNumber();
      const column = reader.readNumber();

      if (i >= cactusComponent.flowerData.length) {
         const flower: CactusBodyFlowerData = {
            type: flowerType,
            height: height,
            rotation: rotation,
            size: size,
            column: column
         };
         flowers.push(flower);
         cactusComponent.flowerData.push(flower);
      }
   }

   const limbs = new Array<CactusLimbData>();
   const numLimbs = reader.readNumber();
   for (let i = 0; i < numLimbs; i++) {
      const limbDirection = reader.readNumber();
      const hasFlower = reader.readBoolean();
      reader.padOffset(3);

      let flower: CactusLimbFlowerData | undefined;
      if (hasFlower) {
         const type = reader.readNumber();
         const height = reader.readNumber();
         const rotation = reader.readNumber();
         const direction = reader.readNumber();
         
         flower = {
            type: type,
            height: height,
            rotation: rotation,
            direction: direction
         };
      }

      if (i >= cactusComponent.limbData.length) {
         const limbData: CactusLimbData = {
            direction: limbDirection,
            flower: flower
         };
         limbs.push(limbData);
         cactusComponent.limbData.push(limbData);
      }
   }

   const renderInfo = getEntityRenderInfo(entity);

   // Attach flower render parts
   for (let i = 0; i < flowers.length; i++) {
      const flowerInfo = flowers[i];

      const renderPart = new TexturedRenderPart(
         null,
         3 + Math.random(),
         flowerInfo.rotation,
         getTextureArrayIndex(getFlowerTextureSource(flowerInfo.type, flowerInfo.size))
      );
      const offsetDirection = flowerInfo.column * Math.PI / 4;
      renderPart.offset.x = flowerInfo.height * Math.sin(offsetDirection);
      renderPart.offset.y = flowerInfo.height * Math.cos(offsetDirection);
      renderInfo.attachRenderPart(renderPart);
   }

   // Limbs
   for (let i = 0; i < limbs.length; i++) {
      const limbInfo = limbs[i];

      const limbRenderPart = new TexturedRenderPart(
         null,
         Math.random(),
         2 * Math.PI * Math.random(),
         getTextureArrayIndex("entities/cactus/cactus-limb.png")
      )
      limbRenderPart.offset.x = CACTUS_RADIUS * Math.sin(limbInfo.direction);
      limbRenderPart.offset.y = CACTUS_RADIUS * Math.cos(limbInfo.direction);
      renderInfo.attachRenderPart(limbRenderPart);
      
      if (typeof limbInfo.flower !== "undefined") {
         const flowerInfo = limbInfo.flower;

         const flowerRenderPart = new TexturedRenderPart(
            limbRenderPart,
            1 + Math.random(),
            flowerInfo.rotation,
            getTextureArrayIndex(getFlowerTextureSource(flowerInfo.type, CactusFlowerSize.small))
         )
         flowerRenderPart.offset.x = flowerInfo.height * Math.sin(flowerInfo.direction);
         flowerRenderPart.offset.y = flowerInfo.height * Math.cos(flowerInfo.direction);
         renderInfo.attachRenderPart(flowerRenderPart);
      }
   }
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Create cactus spine particles when hurt
   const numSpines = randInt(3, 5);
   for (let i = 0; i < numSpines; i++) {
      createCactusSpineParticle(transformComponent, CACTUS_RADIUS - 5, 2 * Math.PI * Math.random());
   }

   playSound("cactus-hit.mp3", 0.4, 1, transformComponent.position);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const cactusComponent = CactusComponentArray.getComponent(entity);

   playSound("cactus-destroy.mp3", 0.4, 1, transformComponent.position);
   
   for (const flower of cactusComponent.flowerData) {
      const offsetDirection = flower.column * Math.PI / 4;
      const spawnPositionX = transformComponent.position.x + flower.height * Math.sin(offsetDirection);
      const spawnPositionY = transformComponent.position.y + flower.height * Math.cos(offsetDirection);

      createFlowerParticle(spawnPositionX, spawnPositionY, flower.type, flower.size, flower.rotation);
   }

   for (const limb of cactusComponent.limbData) {
      if (typeof limb.flower !== "undefined") {
         const spawnPositionX = transformComponent.position.x + CACTUS_RADIUS * Math.sin(limb.direction) + limb.flower.height * Math.sin(limb.flower.direction);
         const spawnPositionY = transformComponent.position.y + CACTUS_RADIUS * Math.cos(limb.direction) + limb.flower.height * Math.cos(limb.flower.direction);

         createFlowerParticle(spawnPositionX, spawnPositionY, limb.flower.type, CactusFlowerSize.small, limb.flower.rotation);
      }
   }
}