import { InventoryComponentData, ServerComponentType } from "../../../../shared/src/components";
import { EntityID, LimbAction } from "../../../../shared/src/entities";
import { InventoryName, Item, ITEM_TYPE_RECORD, Inventory, ItemType, ItemTypeString } from "../../../../shared/src/items/items";
import { PacketReader } from "../../../../shared/src/packets";
import { getHotbarSelectedItemSlot, getPlayerSelectedItemSlot, onItemDeselect, onItemSelect } from "../../components/game/GameInteractableLayer";
import { BackpackInventoryMenu_update } from "../../components/game/inventories/BackpackInventory";
import { Hotbar_update } from "../../components/game/inventories/Hotbar";
import { CraftingMenu_updateRecipes } from "../../components/game/menus/CraftingMenu";
import { playerInstance } from "../../world";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";
import { LimbInfo, InventoryUseComponentArray, inventoryUseComponentHasLimbInfo, getLimbInfoByInventoryName, InventoryUseComponent } from "./InventoryUseComponent";

export interface InventoryComponentParams {
   readonly inventories: Partial<Record<InventoryName, Inventory>>;
}

export interface InventoryComponent {
   readonly inventories: Partial<Record<InventoryName, Inventory>>;
}

const registerInventoryUpdate = (inventoryName: InventoryName): void => {
   // @Hack
   if (inventoryName === InventoryName.hotbar || inventoryName === InventoryName.backpack) {
      CraftingMenu_updateRecipes();
   }
   
   // @Hack: There must be a better way to do this without some switch bullshit to call a hotpot of external functions
   switch (inventoryName) {
      case InventoryName.hotbar:
      case InventoryName.offhand:
      case InventoryName.backpackSlot:
      case InventoryName.armourSlot:
      case InventoryName.gloveSlot: {
         Hotbar_update();
         break;
      }
      case InventoryName.backpack: {
         BackpackInventoryMenu_update();
      }
   }
}

/** Checks if the player is doing a legal action for a given item. */
const playerActionIsLegal = (limb: LimbInfo, item: Item | null): boolean => {
   const action = limb.action;

   // All items can be idle and attack
   if (action === LimbAction.none || action === LimbAction.windAttack || action === LimbAction.attack || action === LimbAction.returnAttackToRest) {
      return true;
   }
   
   if (item !== null) {
      switch (ITEM_TYPE_RECORD[item.type]) {
         case "spear": {
            if (action === LimbAction.chargeSpear) {
               return true;
            }
            break;
         }
      }
   }

   return false;
}

const validatePlayerAction = (inventoryName: InventoryName, item: Item | null): void => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
   if (!inventoryUseComponentHasLimbInfo(inventoryUseComponent, inventoryName)) {
      return;
   }

   const limb = getLimbInfoByInventoryName(inventoryUseComponent, inventoryName);
   if (!playerActionIsLegal(limb, item)) {
      // Reset the action
      limb.action = LimbAction.none;
   }
}

const createInventoryFromData = (inventoryData: Inventory): Inventory => {
   const inventory = new Inventory(inventoryData.width, inventoryData.height, inventoryData.name);
   for (let itemSlot = 1; itemSlot <= inventoryData.width * inventoryData.height; itemSlot++) {
      const item = inventoryData.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         continue;
      }

      inventory.addItem(item, itemSlot);
   }

   return inventory;
}

const updateInventoryFromData = (inventory: Inventory, inventoryData: Inventory, isPlayer: boolean): boolean => {
   let hasChanged = false;
   
   if (inventory.width !== inventoryData.width || inventory.height !== inventoryData.height) {
      inventory.width = inventoryData.width;
      inventory.height = inventoryData.height;
      hasChanged = true;
   }

   // Remove any items which have been removed from the inventory
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         continue;
      }
      
      // If it doesn't exist in the server data, remove it
      const itemData = inventoryData.itemSlots[itemSlot];
      if (typeof itemData === "undefined" || itemData.id !== item.id) {
         inventory.removeItem(itemSlot);
         hasChanged = true;

         if (isPlayer && itemSlot === getPlayerSelectedItemSlot(inventory.name)) {
            updatePlayerHeldItem(inventory.name, itemSlot);
            onItemDeselect(item.type, inventory.name === InventoryName.offhand);

            validatePlayerAction(inventory.name, null);
         }
      }
   }

   // Add all new items from the server data
   for (let itemSlot = 1; itemSlot <= inventoryData.width * inventoryData.height; itemSlot++) {
      const itemData = inventoryData.itemSlots[itemSlot];
      if (typeof itemData === "undefined") {
         continue;
      }
      
      // If there is a new item in the slot, add it
      const item = inventory.itemSlots[itemSlot];
      if (typeof item === "undefined" || item.id !== itemData.id) {
         const item = new Item(itemData.type, itemData.count, itemData.id);
         inventory.addItem(item, itemSlot);
         hasChanged = true;

         if (isPlayer && itemSlot === getPlayerSelectedItemSlot(inventory.name)) {
            onItemSelect(item.type);
            updatePlayerHeldItem(inventory.name, itemSlot);

            validatePlayerAction(inventory.name, item);
         }
      } else if (item.count !== itemData.count) {
         // Otherwise the item needs to be updated with the new server data
         item.count = itemData.count;
         hasChanged = true;
      }
   }

   return hasChanged;
}

const readInventory = (reader: PacketReader): Inventory => {
   const name = reader.readNumber() as InventoryName;
   const width = reader.readNumber();
   const height = reader.readNumber();
   const inventory = new Inventory(width, height, name);

   const numItems = reader.readNumber();
   for (let j = 0; j < numItems; j++) {
      const itemSlot = reader.readNumber();
      const id = reader.readNumber();
      const itemType = reader.readNumber() as ItemType;
      const count = reader.readNumber();

      const item = new Item(itemType, count, id);
      inventory.addItem(item, itemSlot);
   }

   return inventory;
}

export function updatePlayerHeldItem(inventoryName: InventoryName, heldItemSlot: number): void {
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
   
   const inventory = getInventory(inventoryComponent, inventoryName)!;
   const limb = getLimbInfoByInventoryName(inventoryUseComponent, inventoryName);
   
   const heldItem = inventory.getItem(heldItemSlot);
   if (heldItem === null) {
      limb.heldItemType = null;
   } else {
      limb.heldItemType = heldItem.type;
   }
}

export function getInventory(inventoryComponent: InventoryComponent, inventoryName: InventoryName): Inventory | null {
   return inventoryComponent.inventories[inventoryName] || null;
}

export const InventoryComponentArray = new ServerComponentArray<InventoryComponent, InventoryComponentParams, never>(ServerComponentType.inventory, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

function createParamsFromData(reader: PacketReader): InventoryComponentParams {
   const inventories: Partial<Record<InventoryName, Inventory>> = {};
   const numInventories = reader.readNumber();
   for (let i = 0; i < numInventories; i++) {
      const inventory = readInventory(reader);
      inventories[inventory.name] = inventory;
   }

   return {
      inventories: inventories
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.inventory, never>): InventoryComponent {
   return {
      inventories: entityConfig.serverComponents[ServerComponentType.inventory].inventories
   };
}

function updateInventories(inventoryComponent: InventoryComponent, reader: PacketReader, isPlayer: boolean): void {
   // @Temporary @Speed: garbage collection
   const inventories: Partial<Record<InventoryName, Inventory>> = {};
   const numInventories = reader.readNumber();
   for (let i = 0; i < numInventories; i++) {
      const inventory = readInventory(reader);
      inventories[inventory.name] = inventory;
   }
   const data: InventoryComponentData = {
      componentType: ServerComponentType.inventory,
      inventories: inventories
   };
   
   // @Speed: Garbage collection
   // Add new inventories
   for (const inventoryNameKey of Object.keys(data.inventories)) {
      const inventoryName = Number(inventoryNameKey) as InventoryName;
      if (typeof inventoryComponent.inventories[inventoryName] !== "undefined") {
         continue;
      }

      const inventoryData = data.inventories[inventoryName];
      if (typeof inventoryData === "undefined") {
         continue;
      }

      inventoryComponent.inventories[inventoryName] = createInventoryFromData(inventoryData);
      if (isPlayer) {
         registerInventoryUpdate(inventoryName);
      }
   }
   
   // @Speed: Garbage collection
   // Update existing inventories
   for (const inventoryNameKey of Object.keys(inventoryComponent.inventories)) {
      const inventoryName = Number(inventoryNameKey) as InventoryName;
      const inventoryData = data.inventories[inventoryName];
      // @Hack: this shouldn't be necessary, but for some reason is needed sometimes when the player respawns
      if (typeof inventoryData !== "undefined") {
         const inventory = inventoryComponent.inventories[inventoryName]!;
         const hasChanged = updateInventoryFromData(inventory, inventoryData, isPlayer);
         if (hasChanged && isPlayer) {
            registerInventoryUpdate(inventoryName);
         }
      }
   }
}

function padData(reader: PacketReader): void {
   // @Temporary @Garbage
   const inventories: Partial<Record<InventoryName, Inventory>> = {};
   const numInventories = reader.readNumber();
   for (let i = 0; i < numInventories; i++) {
      const inventory = readInventory(reader);
      inventories[inventory.name] = inventory;
   }
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   updateInventories(inventoryComponent, reader, false);
}

function updatePlayerFromData(reader: PacketReader): void {
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
   updateInventories(inventoryComponent, reader, true);
}