import { TribeType } from "battletribes-shared/tribes";
import { useEffect, useReducer, useState } from "react";
import Game from "../../../Game";
import { Inventory } from "battletribes-shared/items/items";
import EmptyItemSlot from "./EmptyItemSlot";
import InventoryContainer from "./InventoryContainer";
import { getHotbarSelectedItemSlot, ItemRestTime } from "../GameInteractableLayer";
import { playerInstance } from "../../../world";
import { playerTribe } from "../../../tribes";

export let Hotbar_update: () => void = () => {};

export let Hotbar_setHotbarSelectedItemSlot: (itemSlot: number) => void = () => {};

export let Hotbar_updateRightThrownBattleaxeItemID: (rightThrownBattleaxeItemID: number) => void = () => {};
export let Hotbar_updateLeftThrownBattleaxeItemID: (leftThrownBattleaxeItemID: number) => void = () => {};

interface HotbarProps {
   readonly hotbar: Inventory;
   readonly offhand: Inventory;
   readonly backpackSlot: Inventory;
   readonly armourSlot: Inventory;
   readonly gloveSlot: Inventory;
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

   const playerID = playerInstance !== null ? playerInstance : undefined;

   return <div id="hotbar">
      <div className="flex-container">
         <EmptyItemSlot className="hidden" />
         <EmptyItemSlot className="hidden" />
         <div className={"inventory" + (playerTribe.tribeType !== TribeType.barbarians ? " hidden" : "")}>
            <InventoryContainer entityID={playerID} inventory={props.offhand} itemRestTimes={props.offhandItemRestTimes} />
         </div>
      </div>
      <div className="middle">
         <div className="inventory">
            {/* @Hack */}
            <InventoryContainer entityID={playerID} inventory={props.hotbar} itemRestTimes={props.hotbarItemRestTimes} selectedItemSlot={getHotbarSelectedItemSlot()} />
         </div>
      </div>
      <div className="flex-container">
         <div className="inventory">
            <InventoryContainer entityID={playerID} inventory={props.backpackSlot} />
            <InventoryContainer entityID={playerID} inventory={props.armourSlot} />
            <InventoryContainer entityID={playerID} inventory={props.gloveSlot} />
         </div>
      </div>
   </div>;
}

export default Hotbar;