import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface FloorSignComponentParams {
   readonly message: string;
}

interface IntermediateInfo {}

export interface FloorSignComponent {
   message: string;
}

export const FloorSignComponentArray = new ServerComponentArray<FloorSignComponent, FloorSignComponentParams, IntermediateInfo>(ServerComponentType.floorSign, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): FloorSignComponentParams {
   const message = reader.readString();
   
   return {
      message: message
   };
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/floor-sign/floor-sign.png")
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
   
   return {};
}

function createComponent(entityParams: EntityParams): FloorSignComponentParams {
   const floorSignComponent = entityParams.serverComponentParams[ServerComponentType.floorSign]!;
   
   return {
      message: floorSignComponent.message
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padString()
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const floorSignComponent = FloorSignComponentArray.getComponent(entity);
   floorSignComponent.message = reader.readString();
}