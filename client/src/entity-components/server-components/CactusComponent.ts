import { CactusFlowerSize, Entity } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { createCactusSpineParticle, createFlowerParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { getHitboxByLocalID, TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { randInt } from "../../../../shared/src/utils";
import { playSoundOnEntity } from "../../sound";
import { EntityConfig } from "../ComponentArray";
import { EntityPreCreationInfo } from "../../world";

export interface CactusFlower {
   readonly parentHitboxLocalID: number;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
   readonly flowerType: number;
   readonly size: CactusFlowerSize;
}

export interface CactusComponentParams {
   readonly flowers: Array<CactusFlower>;
}

interface RenderParts {}

export interface CactusComponent {
   // @Memory: we could just infer these frmo the render parts on the cactus... But first will need to make flowers into client entities (?)
   readonly flowers: ReadonlyArray<CactusFlower>;
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
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): CactusComponentParams {
   const flowers = new Array<CactusFlower>();
   const numFlowers = reader.readNumber();
   for (let i = 0; i < numFlowers; i++) {
      const parentHitboxLocalID = reader.readNumber();
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();
      const rotation = reader.readNumber();
      const flowerType = reader.readNumber();
      const size = reader.readNumber();

      const flower: CactusFlower = {
         parentHitboxLocalID: parentHitboxLocalID,
         offsetX: offsetX,
         offsetY: offsetY,
         rotation: rotation,
         flowerType: flowerType,
         size: size
      };
      flowers.push(flower);
   }

   return {
      flowers: flowers
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.transform | ServerComponentType.cactus, never>): RenderParts {
   const transformComponentConfig = entityConfig.serverComponents[ServerComponentType.transform];
   for (let i = 0; i < transformComponentConfig.hitboxes.length; i++) {
      const hitbox = transformComponentConfig.hitboxes[i];

      const baseRenderPart = new TexturedRenderPart(
         hitbox,
         i === 0 ? 2 : Math.random(),
         0,
         getTextureArrayIndex(i === 0 ? "entities/cactus/cactus.png" : "entities/cactus/cactus-limb.png")
      );
      renderInfo.attachRenderPart(baseRenderPart);
   }

   // Flowers
   const cactusComponentConfig = entityConfig.serverComponents[ServerComponentType.cactus];
   for (const flower of cactusComponentConfig.flowers) {
      const hitbox = getHitboxByLocalID(transformComponentConfig.hitboxes, flower.parentHitboxLocalID);

      const renderPart = new TexturedRenderPart(
         hitbox,
         3 + Math.random(),
         flower.rotation,
         getTextureArrayIndex(getFlowerTextureSource(flower.flowerType, flower.size))
      );
      renderPart.offset.x = flower.offsetX;
      renderPart.offset.y = flower.offsetY;
      renderInfo.attachRenderPart(renderPart);
   }

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.cactus, never>): CactusComponent {
   const cactusComponentConfig = entityConfig.serverComponents[ServerComponentType.cactus];
   return {
      flowers: cactusComponentConfig.flowers
   };
}

function getMaxRenderParts(preCreationInfo: EntityPreCreationInfo<ServerComponentType.transform | ServerComponentType.cactus>): number {
   const transformComponentConfig = preCreationInfo.serverComponentParams[ServerComponentType.transform];
   const cactusComponentConfig = preCreationInfo.serverComponentParams[ServerComponentType.cactus];
   return transformComponentConfig.hitboxes.length + cactusComponentConfig.flowers.length;
}

function padData(reader: PacketReader): void {
   const numFlowers = reader.readNumber();
   reader.padOffset(6 * Float32Array.BYTES_PER_ELEMENT * numFlowers);
}

function updateFromData(reader: PacketReader): void {
   padData(reader);
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Create cactus spine particles when hurt
   const numSpines = randInt(3, 5);
   for (let i = 0; i < numSpines; i++) {
      createCactusSpineParticle(transformComponent, CACTUS_RADIUS - 5, 2 * Math.PI * Math.random());
   }

   playSoundOnEntity("cactus-hit.mp3", 0.4, 1, entity, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const cactusComponent = CactusComponentArray.getComponent(entity);

   playSoundOnEntity("cactus-destroy.mp3", 0.4, 1, entity, false);
   
   for (const flower of cactusComponent.flowers) {
      const spawnPositionX = transformComponent.position.x + flower.offsetX;
      const spawnPositionY = transformComponent.position.y + flower.offsetY;

      createFlowerParticle(spawnPositionX, spawnPositionY, flower.flowerType, flower.size, flower.rotation);
   }
}