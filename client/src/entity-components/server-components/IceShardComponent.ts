import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";

export interface IceShardComponentParams {}

export interface IceShardComponent {}

export const IceShardComponentArray = new ServerComponentArray<IceShardComponent, IceShardComponentParams, never>(ServerComponentType.iceShard, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): IceShardComponentParams {
   return {};
}

function createComponent(entityConfig: EntityConfig<never, never>): IceShardComponent {
   entityConfig.renderInfo.attachRenderThing(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("projectiles/ice-shard.png")
      )
   );

   return {};
}

function padData(): void {}

function updateFromData(): void {}