import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface IceShardComponentParams {}

interface IntermediateInfo {}

export interface IceShardComponent {}

export const IceShardComponentArray = new ServerComponentArray<IceShardComponent, IceShardComponentParams, IntermediateInfo>(ServerComponentType.iceShard, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): IceShardComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IceShardComponent {
   const transformComponent = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponent.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("projectiles/ice-shard.png")
      )
   );

   return {};
}

function createComponent() {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}