import { useEffect, useState } from "react";
import { AnimalStaffItemInfo, Item, ITEM_INFO_RECORD, ITEM_TYPE_RECORD } from "../../../../../shared/src/items/items";
import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";

export let ItemTooltip_setItem: (item: Item | null) => void = () => {};
export let ItemTooltip_setPos: (x: number, y: number) => void = () => {};
export let ItemTooltip_hide: () => void;

export const ItemTooltip = () => {
   const [item, setItem] = useState<Item | null>(null);
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);

   useEffect(() => {
      ItemTooltip_setItem = (item: Item | null): void => {
         setItem(item);
      }
      
      ItemTooltip_setPos = (x: number, y: number): void => {
         setX(x);
         setY(y);
      }

      ItemTooltip_hide = (): void => {
         setItem(null);
      }
   }, []);

   if (item === null) {
      return null;
   }
   
   const clientItemInfo = CLIENT_ITEM_INFO_RECORD[item.type];

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   const itemInfo = ITEM_INFO_RECORD[item.type];
   
   return <div id="item-tooltip" style={{left: x + "px", top: y + "px"}}>
      <p className="item-name">{clientItemInfo.name}</p>

      {itemCategory === "animalStaff" && (
         <p>Control range: {(itemInfo as AnimalStaffItemInfo).controlRange} units</p>
      )}

      {typeof clientItemInfo.flavourText !== "undefined" ? (
         <p className="flavour-text">{clientItemInfo.flavourText}</p>
      ) : null}
   </div>;
}