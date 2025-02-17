import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { randFloat, randInt } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createColouredParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnEntity } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";
import { getRandomPositionInEntity, TransformComponentArray } from "./TransformComponent";

export interface MithrilOreNodeComponentParams {
   readonly size: number;
   readonly variant: number;
   readonly renderHeight: number;
}

interface RenderParts {}

export interface MithrilOreNodeComponent {}

export const MithrilOreNodeComponentArray = new ServerComponentArray<MithrilOreNodeComponent, MithrilOreNodeComponentParams, RenderParts>(ServerComponentType.mithrilOreNode, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): MithrilOreNodeComponentParams {
   const size = reader.readNumber();
   const variant = reader.readNumber();
   const renderHeight = reader.readNumber();
   return {
      size: size,
      variant: variant,
      renderHeight: renderHeight
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.mithrilOreNode, never>): RenderParts {
   const mithrilOreNodeComponentParams = entityConfig.serverComponents[ServerComponentType.mithrilOreNode];
   const size = mithrilOreNodeComponentParams.size;
   const variant = mithrilOreNodeComponentParams.variant;

   let textureSource: string;
   switch (size) {
      case 0: {
         textureSource = "entities/mithril-ore-node/mithril-ore-node-large-" + (variant + 1) + ".png";
         break;
      }
      case 1: {
         textureSource = "entities/mithril-ore-node/mithril-ore-node-medium-" + (variant + 1) + ".png";
         break;
      }
      case 2: {
         textureSource = "entities/mithril-ore-node/mithril-ore-node-small-" + (variant + 1) + ".png";
         break;
      }
      default: {
         throw new Error();
      }
   }
   
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(textureSource)
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): MithrilOreNodeComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   padData(reader);
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < 3; i++) {
      const c = randFloat(0.25, 0.4);
      
      const position = getRandomPositionInEntity(transformComponent);
      createColouredParticle(position.x, position.y, randFloat(50, 80), c, c, c);
   }
   
   playSoundOnEntity("mithril-hit-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.9, 1.1), entity, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < 6; i++) {
      const c = randFloat(0.25, 0.4);
      
      const position = getRandomPositionInEntity(transformComponent);
      createColouredParticle(position.x, position.y, randFloat(50, 80), c, c, c);
   }

   playSoundOnEntity("mithril-hit-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.9, 1.1), entity, false);
   playSoundOnEntity("mithril-death.mp3", 0.4, randFloat(0.9, 1.1), entity, false);
}