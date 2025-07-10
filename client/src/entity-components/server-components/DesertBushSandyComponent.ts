import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface DesertBushSandyComponentParams {
   readonly size: number;
}

interface IntermediateInfo {}

export interface DesertBushSandyComponent {}

export const DesertBushSandyComponentArray = new ServerComponentArray<DesertBushSandyComponent, DesertBushSandyComponentParams, IntermediateInfo>(ServerComponentType.desertBushSandy, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): DesertBushSandyComponentParams {
   const size = reader.readNumber();
   
   return {
      size: size
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   const desertBushSandyComponentParams = entityParams.serverComponentParams[ServerComponentType.desertBushSandy]!;
   
   let textureSource: string;
   if (desertBushSandyComponentParams.size === 0) {
      textureSource = "entities/desert-bush-sandy/desert-bush-sandy.png";
   } else {
      textureSource = "entities/desert-bush-sandy/desert-bush-sandy-large.png";
   }
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(textureSource)
   );
   renderPart.tintR = randFloat(-0.02, 0.02);
   renderPart.tintG = randFloat(-0.02, 0.02);
   renderPart.tintB = randFloat(-0.02, 0.02);
   renderInfo.attachRenderPart(renderPart)

   return {
      renderPart: renderPart
   };
}

function createComponent(): DesertBushSandyComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   padData(reader);
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("desert-plant-hit.mp3", randFloat(0.375, 0.425), randFloat(0.85, 1.15), entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   playSoundOnHitbox("desert-plant-hit.mp3", randFloat(0.375, 0.425), randFloat(0.85, 1.15), entity, hitbox, false);
}