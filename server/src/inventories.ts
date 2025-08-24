import { EntityType } from "../../shared/src/entities";
import { Inventory, InventoryName, ItemType } from "../../shared/src/items/items";
import { Settings } from "../../shared/src/settings";
import { addInventoryToInventoryComponent, InventoryComponent } from "./components/InventoryComponent";
import { InventoryUseComponent } from "./components/InventoryUseComponent";
import { createItem } from "./items";

const getTribesmanHotbarSize = (entityType: EntityType): number => {
   switch (entityType) {
      case EntityType.player: return Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      case EntityType.tribeWorker: return 7;
      case EntityType.tribeWarrior: return 5;
      case EntityType.cogwalker: return 5;
      case EntityType.scrappy: return 1;
      default: {
         throw new Error();
      }
   }
}

export function addHumanoidInventories(inventoryComponent: InventoryComponent, inventoryUseComponent: InventoryUseComponent, entityType: EntityType): void {
   // Hotbar
   const hotbarInventory = new Inventory(getTribesmanHotbarSize(entityType), 1, InventoryName.hotbar);
   addInventoryToInventoryComponent(inventoryComponent, hotbarInventory, { acceptsPickedUpItems: true, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   hotbarInventory.addItem(createItem(ItemType.stone_sword, 1), 1);
   hotbarInventory.addItem(createItem(ItemType.wood, 31), 2);
   hotbarInventory.addItem(createItem(ItemType.tamingAlmanac, 1), 3);
   hotbarInventory.addItem(createItem(ItemType.animalStaff, 1), 4);
   hotbarInventory.addItem(createItem(ItemType.cooked_beef, 11), 5);
   

   inventoryUseComponent.associatedInventoryNames.push(InventoryName.hotbar);
   
   if (entityType !== EntityType.scrappy) {
      // Offhand
      const offhandInventory = new Inventory(1, 1, InventoryName.offhand);
      addInventoryToInventoryComponent(inventoryComponent, offhandInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   
      inventoryUseComponent.associatedInventoryNames.push(InventoryName.offhand);
      
      // Crafting output slot
      const craftingOutputInventory = new Inventory(1, 1, InventoryName.craftingOutputSlot);
      addInventoryToInventoryComponent(inventoryComponent, craftingOutputInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
      
      // Held item slot
      const heldItemInventory = new Inventory(1, 1, InventoryName.heldItemSlot);
      addInventoryToInventoryComponent(inventoryComponent, heldItemInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
      
      // @Hack @Robustness
      const hasExtraInventories = entityType === EntityType.player || entityType === EntityType.tribeWarrior || entityType === EntityType.tribeWorker;
      if (hasExtraInventories) {
         // Armour slot
         const armourSlotInventory = new Inventory(1, 1, InventoryName.armourSlot);
         addInventoryToInventoryComponent(inventoryComponent, armourSlotInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: true });
         
         // Backpack slot
         const backpackSlotInventory = new Inventory(1, 1, InventoryName.backpackSlot);
         addInventoryToInventoryComponent(inventoryComponent, backpackSlotInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
         
         // Glove slot
         const gloveSlotInventory = new Inventory(1, 1, InventoryName.gloveSlot);
         addInventoryToInventoryComponent(inventoryComponent, gloveSlotInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: true });
      }
      
      // Backpack
      const backpackInventory = new Inventory(1, 1, InventoryName.backpack);
      addInventoryToInventoryComponent(inventoryComponent, backpackInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   }
}