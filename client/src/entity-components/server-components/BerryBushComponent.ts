import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";
import { EntityRenderInfo } from "../../Entity";

export interface BerryBushComponentParams {
   readonly numBerries: number;
}

interface RenderParts {
   readonly renderPart: TexturedRenderPart;
}

export interface BerryBushComponent {
   numBerries: number;
   readonly renderPart: TexturedRenderPart;
}

const BERRY_BUSH_TEXTURE_SOURCES = [
   "entities/berry-bush1.png",
   "entities/berry-bush2.png",
   "entities/berry-bush3.png",
   "entities/berry-bush4.png",
   "entities/berry-bush5.png",
   "entities/berry-bush6.png"
];

export const BerryBushComponentArray = new ServerComponentArray<BerryBushComponent, BerryBushComponentParams, RenderParts>(ServerComponentType.berryBush, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): BerryBushComponentParams {
   const numBerries = reader.readNumber();
   return {
      numBerries: numBerries
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.berryBush>): RenderParts {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(BERRY_BUSH_TEXTURE_SOURCES[entityConfig.components[ServerComponentType.berryBush].numBerries])
   );
   renderPart.addTag("berryBushComponent:renderPart");
   renderInfo.attachRenderThing(renderPart)

   return {
      renderPart: renderPart
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.berryBush>, renderParts: RenderParts): BerryBushComponent {
   return {
      numBerries: entityConfig.components[ServerComponentType.berryBush].numBerries,
      renderPart: renderParts.renderPart
   };
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const berryBushComponent = BerryBushComponentArray.getComponent(entity);
   
   berryBushComponent.numBerries = reader.readNumber();

   berryBushComponent.renderPart.switchTextureSource(BERRY_BUSH_TEXTURE_SOURCES[berryBushComponent.numBerries]);
   // @Bug: not working!
   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.dirty();
}