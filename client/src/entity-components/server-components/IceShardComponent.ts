import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";

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

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IceShardComponent {
   const transformComponent = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponent.hitboxes[0];
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
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