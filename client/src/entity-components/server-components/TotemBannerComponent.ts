import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, TribeTotemBanner } from "battletribes-shared/entities";
import { TribeType } from "battletribes-shared/tribes";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { playBuildingHitSound, playSound } from "../../sound";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { TribeComponentArray } from "./TribeComponent";
import { EntityConfig } from "../ComponentArray";

export interface TotemBannerComponentParams {
   readonly banners: Record<number, TribeTotemBanner>;
}

interface RenderParts {
   readonly bannerRenderParts: Record<number, RenderPart>;
}

export interface TotemBannerComponent {
   readonly banners: Record<number, TribeTotemBanner>;
   readonly bannerRenderParts: Record<number, RenderPart>;
}

const BANNER_LAYER_DISTANCES = [34, 52, 65];

export const TotemBannerComponentArray = new ServerComponentArray<TotemBannerComponent, TotemBannerComponentParams, RenderParts>(ServerComponentType.totemBanner, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): TotemBannerComponentParams {
   const banners = new Array<TribeTotemBanner>();
   const numBanners = reader.readNumber();
   for (let i = 0; i < numBanners; i++) {
      const hutNum = reader.readNumber();
      const layer = reader.readNumber();
      const direction = reader.readNumber();

      const banner: TribeTotemBanner = {
         hutNum: hutNum,
         layer: layer,
         direction: direction
      };
      banners.push(banner);
   }

   return {
      banners: banners
   };
}

const createBannerRenderPart = (tribeType: TribeType, renderInfo: EntityRenderInfo, banner: TribeTotemBanner): TexturedRenderPart => {
   let totemTextureSourceID: string;
   switch (tribeType) {
      case TribeType.plainspeople: {
         totemTextureSourceID = "plainspeople-banner.png";
         break;
      }
      case TribeType.goblins: {
         totemTextureSourceID = "goblin-banner.png";
         break;
      }
      case TribeType.barbarians: {
         totemTextureSourceID = "barbarian-banner.png";
         break;
      }
      case TribeType.frostlings: {
         totemTextureSourceID = "frostling-banner.png";
         break;
      }
   }

   const renderPart = new TexturedRenderPart(
      null,
      2,
      banner.direction,
      getTextureArrayIndex(`entities/tribe-ttem/${totemTextureSourceID}`)
   );
   const bannerOffsetAmount = BANNER_LAYER_DISTANCES[banner.layer];
   renderPart.offset.x = bannerOffsetAmount * Math.sin(banner.direction);
   renderPart.offset.y = bannerOffsetAmount * Math.cos(banner.direction);

   renderInfo.attachRenderThing(renderPart);

   return renderPart;
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.totemBanner | ServerComponentType.tribe, never>): RenderParts {
   // Main render part
   renderInfo.attachRenderThing(
      new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex(`entities/tribe-totem/tribe-totem.png`)
      )
   );
   
   const bannerComponentParams = entityConfig.serverComponents[ServerComponentType.totemBanner];
   const tribeComponentParams = entityConfig.serverComponents[ServerComponentType.tribe];
   
   const renderParts = new Array<TexturedRenderPart>();
   
   for (const banner of Object.values(bannerComponentParams.banners)) {
      const renderPart = createBannerRenderPart(tribeComponentParams.tribeType, renderInfo, banner);
      renderParts.push(renderPart);
   }

   return {
      bannerRenderParts: renderParts
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.totemBanner, never>, renderParts: RenderParts): TotemBannerComponent {
   return {
      banners: entityConfig.serverComponents[ServerComponentType.totemBanner].banners,
      bannerRenderParts: renderParts.bannerRenderParts
   };
}

function padData(reader: PacketReader): void {
   const numBanners = reader.readNumber();
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT * numBanners);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const totemBannerComponent = TotemBannerComponentArray.getComponent(entity);
   
   // @Garbage
   const removedBannerNums = Object.keys(totemBannerComponent.banners).map(num => Number(num));
   
   // @Temporary @Speed @Garbage
   const banners = new Array<TribeTotemBanner>();
   const numBanners = reader.readNumber();
   for (let i = 0; i < numBanners; i++) {
      const hutNum = reader.readNumber();
      const layer = reader.readNumber();
      const direction = reader.readNumber();

      const banner: TribeTotemBanner = {
         hutNum: hutNum,
         layer: layer,
         direction: direction
      };
      banners.push(banner);
   }
   
   const renderInfo = getEntityRenderInfo(entity);
   
   // Add new banners
   for (const banner of banners) {
      if (!totemBannerComponent.banners.hasOwnProperty(banner.hutNum)) {
         const tribeComponent = TribeComponentArray.getComponent(entity);
         const renderPart = createBannerRenderPart(tribeComponent.tribeType, renderInfo, banner);
         totemBannerComponent.bannerRenderParts[banner.hutNum] = renderPart;
         totemBannerComponent.banners[banner.hutNum] = banner;
      }

      const idx = removedBannerNums.indexOf(banner.hutNum);
      if (idx !== -1) {
         removedBannerNums.splice(idx, 1);
      }
   }
   
   // Remove banners which are no longer there
   for (const hutNum of removedBannerNums) {
      renderInfo.removeRenderPart(totemBannerComponent.bannerRenderParts[hutNum]);
      delete totemBannerComponent.bannerRenderParts[hutNum];
      delete totemBannerComponent.banners[hutNum];
   }
}

function onHit(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playBuildingHitSound(transformComponent.position);
}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("building-destroy-1.mp3", 0.4, 1, transformComponent.position);
}