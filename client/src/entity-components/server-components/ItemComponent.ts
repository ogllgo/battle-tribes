import { ServerComponentType } from "battletribes-shared/components";
import { createDeepFrostHeartBloodParticles } from "../../particles";
import { ItemType } from "battletribes-shared/items/items";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";

export interface ItemComponentParams {
   readonly itemType: ItemType;
}

export interface ItemComponent {
   readonly itemType: ItemType;
}

export const ItemComponentArray = new ServerComponentArray<ItemComponent, ItemComponentParams, never>(ServerComponentType.item, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
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

function createComponent(entityConfig: EntityConfig<ServerComponentType.item>): ItemComponent {
   return {
      itemType: entityConfig.components[ServerComponentType.item].itemType
   };
}

function onTick(itemComponent: ItemComponent, entity: EntityID): void {
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