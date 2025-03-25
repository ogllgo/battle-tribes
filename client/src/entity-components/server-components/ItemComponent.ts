import { ServerComponentType } from "battletribes-shared/components";
import { createDeepFrostHeartBloodParticles } from "../../particles";
import { ItemType } from "battletribes-shared/items/items";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { createLight } from "../../lights";
import { Point } from "../../../../shared/src/utils";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface ItemComponentParams {
   readonly itemType: ItemType;
}

interface IntermediateInfo {}

export interface ItemComponent {
   readonly itemType: ItemType;
}

export const ItemComponentArray = new ServerComponentArray<ItemComponent, ItemComponentParams, IntermediateInfo>(ServerComponentType.item, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
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

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const itemComponentParams = entityParams.serverComponentParams[ServerComponentType.item]!;
      
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[itemComponentParams.itemType].entityTextureSource)
   )
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   if (itemComponentParams.itemType === ItemType.slurb) {
      const light = createLight(new Point(0, 0), 0.6, 0.5, 4, 1, 0.1, 1);
      entityIntermediateInfo.lights.push({
         light: light,
         attachedRenderPart: renderPart
      });
   }

   return {};
}

function createComponent(entityParams: EntityParams): ItemComponent {
   return {
      itemType: entityParams.serverComponentParams[ServerComponentType.item]!.itemType
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
      const hitbox = transformComponent.children[0] as Hitbox;
      createDeepFrostHeartBloodParticles(hitbox.box.position.x, hitbox.box.position.y, 0, 0);
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}