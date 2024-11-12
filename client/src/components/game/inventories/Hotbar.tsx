import { TribeType } from "battletribes-shared/tribes";
import { useEffect, useReducer, useState } from "react";
import Game from "../../../Game";
import { Inventory, InventoryName } from "battletribes-shared/items/items";
import EmptyItemSlot from "./EmptyItemSlot";
import { getInventory, InventoryComponentArray } from "../../../entity-components/server-components/InventoryComponent";
import InventoryContainer from "./InventoryContainer";
import { getHotbarSelectedItemSlot, ItemRestTime } from "../GameInteractableLayer";
import { playerInstance } from "../../../world";

export let Hotbar_update: () => void = () => {};

export let Hotbar_setHotbarSelectedItemSlot: (itemSlot: number) => void = () => {};

export let Hotbar_updateRightThrownBattleaxeItemID: (rightThrownBattleaxeItemID: number) => void = () => {};
export let Hotbar_updateLeftThrownBattleaxeItemID: (leftThrownBattleaxeItemID: number) => void = () => {};

interface HotbarProps {
   readonly hotbar: Inventory;
   readonly hotbarItemRestTimes: ReadonlyArray<ItemRestTime>;
   readonly offhandItemRestTimes: ReadonlyArray<ItemRestTime>;
}

const Hotbar = (props: HotbarProps) => {
   const [selectedItemSlot, setSelectedItemSlot] = useState(1);
   // @Incomplete
   const [rightThrownBattleaxeItemID, setRightThrownBattleaxeItemID] = useState(-1);
   const [leftThrownBattleaxeItemID, setLeftThrownBattleaxeItemID] = useState(-1);
   const [, update] = useReducer(x => x + 1, 0);

   useEffect(() => {
      Hotbar_update = () => {
         update();
      }

      Hotbar_setHotbarSelectedItemSlot = (itemSlot: number): void => {
         setSelectedItemSlot(itemSlot);
      }
 
      Hotbar_updateRightThrownBattleaxeItemID = (rightThrownBattleaxeItemID: number): void => {
         setRightThrownBattleaxeItemID(rightThrownBattleaxeItemID);
      }

      Hotbar_updateLeftThrownBattleaxeItemID = (leftThrownBattleaxeItemID: number): void => {
         setLeftThrownBattleaxeItemID(leftThrownBattleaxeItemID);
      }
   }, []);

   const playerID = playerInstance || undefined;
   
   const inventoryComponent = playerInstance !== null ? InventoryComponentArray.getComponent(playerInstance) : undefined;
   const offhand = typeof inventoryComponent !== "undefined" ? getInventory(inventoryComponent, InventoryName.offhand) : null;
   const backpackSlot = typeof inventoryComponent !== "undefined" ? getInventory(inventoryComponent, InventoryName.backpackSlot) : null;
   const armourSlot = typeof inventoryComponent !== "undefined" ? getInventory(inventoryComponent, InventoryName.armourSlot) : null;
   const gloveSlot = typeof inventoryComponent !== "undefined" ? getInventory(inventoryComponent, InventoryName.gloveSlot) : null;

   return <div id="hotbar">
      <div className="flex-container">
         <EmptyItemSlot className="hidden" />
         <EmptyItemSlot className="hidden" />
         <div className={"inventory" + (Game.tribe.tribeType !== TribeType.barbarians ? " hidden" : "")}>
            <InventoryContainer entityID={playerID} inventory={offhand} itemRestTimes={props.offhandItemRestTimes} />
         </div>
      </div>
      <div className="middle">
         <div className="inventory">
            <InventoryContainer entityID={playerID} inventory={props.hotbar} itemRestTimes={props.hotbarItemRestTimes} selectedItemSlot={getHotbarSelectedItemSlot()} />
         </div>
      </div>
      <div className="flex-container">
         <div className="inventory">
            <InventoryContainer entityID={playerID} inventory={backpackSlot} />
            <InventoryContainer entityID={playerID} inventory={armourSlot} />
            <InventoryContainer entityID={playerID} inventory={gloveSlot} />
         </div>
      </div>
   </div>;
}

export default Hotbar;