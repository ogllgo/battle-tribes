import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ArmourItemType, ItemType, GloveItemType, ItemTypeString, InventoryName } from "battletribes-shared/items/items";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getInventory, InventoryComponentArray } from "../server-components/InventoryComponent";
import { getEntityRenderInfo } from "../../world";
import { InventoryUseComponentArray } from "../server-components/InventoryUseComponent";
import ClientComponentArray from "../ClientComponentArray";
import { EntityID } from "../../../../shared/src/entities";
import { ClientComponentType } from "../client-component-types";

export interface EquipmentComponentParams {}

export interface EquipmentComponent {
   armourRenderPart: TexturedRenderPart | null;
   gloveRenderParts: Array<TexturedRenderPart>;
   
   // @Incomplete: i broke the frost shield at some point
   hasFrostShield: boolean;
}

interface ArmourInfo {
   readonly textureSource: string;
}

const ARMOUR_WORN_INFO: Record<ArmourItemType, ArmourInfo> = {
   [ItemType.leather_armour]: {
      textureSource: "armour/leather-armour.png"
   },
   [ItemType.frost_armour]: {
      textureSource: "armour/frost-armour.png"
   },
   [ItemType.deepfrost_armour]: {
      textureSource: "armour/deepfrost-armour.png"
   },
   [ItemType.meat_suit]: {
      textureSource: "armour/meat-suit.png"
   },
   [ItemType.fishlord_suit]: {
      textureSource: "armour/fishlord-suit.png"
   },
   [ItemType.leaf_suit]: {
      textureSource: "armour/leaf-suit.png"
   }
};

const GLOVES_TEXTURE_SOURCE_RECORD: Record<GloveItemType, string> = {
   [ItemType.gathering_gloves]: "gloves/gathering-gloves.png",
   [ItemType.gardening_gloves]: "gloves/gardening-gloves.png"
};

const getArmourTextureSource = (armourType: ItemType): string => {
   if (!ARMOUR_WORN_INFO.hasOwnProperty(armourType)) {
      console.warn("Can't find armour info for item type '" + ItemTypeString[armourType] + ".");
      return "";
   }

   return ARMOUR_WORN_INFO[armourType as ArmourItemType].textureSource;
}

const getGloveTextureSource = (gloveType: ItemType): string => {
   if (!GLOVES_TEXTURE_SOURCE_RECORD.hasOwnProperty(gloveType)) {
      console.warn("Can't find glove info for item type '" + ItemTypeString[gloveType] + ".");
      return "";
   }

   return GLOVES_TEXTURE_SOURCE_RECORD[gloveType as GloveItemType];
}

// @Incomplete
// public createFrostShieldBreakParticles(): void {
//    const transformComponent = TransformComponentArray.getComponent(this.entity.id);
//    for (let i = 0; i < 17; i++) {
//       createFrostShieldBreakParticle(transformComponent.position.x, transformComponent.position.y);
//    }
// }

// @Incomplete
// public genericUpdateFromData(entityData: EntityData<EntityType.player> | EntityData<EntityType.tribeWorker> | EntityData<EntityType.tribeWarrior>): void {
//    const hasFrostShield = entityData.clientArgs[15];
//    if (this.hasFrostShield && !hasFrostShield) {
//       this.createFrostShieldBreakParticles();
//    }
//    this.hasFrostShield = hasFrostShield;
// }

export const EquipmentComponentArray = new ClientComponentArray<EquipmentComponent>(ClientComponentType.equipment, true, {
   createComponent: createComponent,
   onLoad: onLoad,
   onTick: onTick
});

export function createEquipmentComponentParams(): EquipmentComponentParams {
   return {};
}

function createComponent(): EquipmentComponent {
   return {
      armourRenderPart: null,
      gloveRenderParts: [],
      hasFrostShield: false
   };
}

function onLoad(entity: EntityID): void {
   const equipmentComponent = EquipmentComponentArray.getComponent(entity);
   updateArmourRenderPart(equipmentComponent, entity);
   updateGloveRenderParts(equipmentComponent, entity);
}

/** Updates the current armour render part based on the entity's inventory component */
const updateArmourRenderPart = (equipmentComponent: EquipmentComponent, entity: EntityID): void => {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot)!;
   
   const armour = armourInventory.itemSlots[1];
   if (typeof armour !== "undefined") {
      
      if (equipmentComponent.armourRenderPart === null) {
         equipmentComponent.armourRenderPart = new TexturedRenderPart(
            null,
            3,
            0,
            getTextureArrayIndex(getArmourTextureSource(armour.type))
         );

         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(equipmentComponent.armourRenderPart);
      } else {
         equipmentComponent.armourRenderPart.switchTextureSource(getArmourTextureSource(armour.type));
      }
   } else if (equipmentComponent.armourRenderPart !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(equipmentComponent.armourRenderPart);
      equipmentComponent.armourRenderPart = null;
   }
}

// @Cleanup: Copy and paste from armour
const updateGloveRenderParts = (equipmentComponent: EquipmentComponent, entity: EntityID): void => {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const gloveInventory = getInventory(inventoryComponent, InventoryName.gloveSlot)!;
   
   // @Incomplete: Make a glove for every hand
   const glove = gloveInventory.itemSlots[1];
   if (typeof glove !== "undefined") {
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

      if (equipmentComponent.gloveRenderParts.length === 0) {
         for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
            const gloveRenderPart = new TexturedRenderPart(
               inventoryUseComponent.limbRenderParts[limbIdx],
               1.1,
               0,
               getTextureArrayIndex(getGloveTextureSource(glove.type))
            );
            equipmentComponent.gloveRenderParts.push(gloveRenderPart);

            const renderInfo = getEntityRenderInfo(entity);
            renderInfo.attachRenderPart(gloveRenderPart);
         }
      } else {
         for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
            equipmentComponent.gloveRenderParts[limbIdx].switchTextureSource(getGloveTextureSource(glove.type));
         }
      }
   } else {
      while (equipmentComponent.gloveRenderParts.length > 0) {
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.removeRenderPart(equipmentComponent.gloveRenderParts[0]);
         equipmentComponent.gloveRenderParts.splice(0, 1);
      }
   }
}

function onTick(entity: EntityID): void {
   const equipmentComponent = EquipmentComponentArray.getComponent(entity);
   updateArmourRenderPart(equipmentComponent, entity);
   updateGloveRenderParts(equipmentComponent, entity);
}