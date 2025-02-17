import { ServerComponentType } from "battletribes-shared/components";
import { createDeepFrostHeartBloodParticles } from "../../particles";
import { ITEM_TRAITS_RECORD, ItemType } from "battletribes-shared/items/items";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { EntityConfig } from "../ComponentArray";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { attachLightToRenderPart, createLight } from "../../lights";
import { Point } from "../../../../shared/src/utils";

export interface ItemComponentParams {
   readonly itemType: ItemType;
}

interface RenderParts {}

export interface ItemComponent {
   readonly itemType: ItemType;
}

export const ItemComponentArray = new ServerComponentArray<ItemComponent, ItemComponentParams, RenderParts>(ServerComponentType.item, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): ItemComponentParams {
   const itemType = reader.readNumber();
   return {
      itemType: itemType
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.item, never>): RenderParts {
   const itemComponentParams = entityConfig.serverComponents[ServerComponentType.item];
      
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[itemComponentParams.itemType].entityTextureSource)
   )
   renderInfo.attachRenderPart(renderPart);

   if (itemComponentParams.itemType === ItemType.slurb) {
      const torch = ITEM_TRAITS_RECORD[ItemType.slurb].torch!;
      const light = createLight(new Point(0, 0), torch.lightIntensity, torch.lightStrength, torch.lightRadius, torch.lightR, torch.lightG, torch.lightB);
      attachLightToRenderPart(light, renderPart, entityConfig.entity, entityConfig.layer);
   }

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.item, never>): ItemComponent {
   return {
      itemType: entityConfig.serverComponents[ServerComponentType.item].itemType
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
   const itemComponent = ItemComponentArray.getComponent(entity);
   
   // Make the deep frost heart item spew blue blood particles
   if (itemComponent.itemType === ItemType.deepfrost_heart) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      createDeepFrostHeartBloodParticles(transformComponent.position.x, transformComponent.position.y, 0, 0);
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}