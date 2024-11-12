import { useCallback, useEffect, useRef, useState } from "react";
import ChatBox from "./ChatBox";
import NerdVision from "./dev/NerdVision";
import HealthBar from "./HealthBar";
import CraftingMenu from "./menus/CraftingMenu";
import DeathScreen from "./DeathScreen";
import BackpackInventoryMenu from "./inventories/BackpackInventory";
import TechTree from "./tech-tree/TechTree";
import BuildMenu from "./BuildMenu";
import TechInfocard from "./TechInfocard";
import InventorySelector from "./inventories/InventorySelector";
import InspectHealthBar from "./InspectHealthBar";
import Infocards from "./infocards/Infocards";
import SummonCrosshair from "./SummonCrosshair";
import { AppState } from "../App";
import { EntitySummonPacket } from "../../../../shared/src/dev-packets";
import { Mutable } from "../../../../shared/src/utils";
import { calculateCursorWorldPositionX, calculateCursorWorldPositionY } from "../../mouse";
import GameInteractableLayer from "./GameInteractableLayer";
import { sendEntitySummonPacket } from "../../networking/packet-creation";
import { copyInventory, Inventory, InventoryName } from "../../../../shared/src/items/items";
import { Settings } from "../../../../shared/src/settings";
import { playerInstance } from "../../world";
import { getInventory, InventoryComponentArray } from "../../entity-components/server-components/InventoryComponent";
import { inventoriesAreDifferent } from "../../inventory-manipulation";

export const enum GameInteractState {
   none,
   summonEntity
}

export let openSettingsMenu: () => void;
export let closeSettingsMenu: () => void;
export let toggleSettingsMenu: () => void;

export let toggleCinematicMode: () => void;

export let gameScreenSetIsDead: (isDead: boolean) => void = () => {};

export let GameScreen_update: () => void = () => {};

interface GameScreenProps {
   setAppState(appState: AppState): void;
}

const GameScreen = (props: GameScreenProps) => {
   const [settingsIsOpen, setSettingsIsOpen] = useState(false);
   const [isDead, setIsDead] = useState(false);
   const [cinematicModeIsEnabled, setCinematicModeIsEnabled] = useState(false);
   const [interactState, setInteractState] = useState(GameInteractState.none);

   const [hotbar, setHotbar] = useState(new Inventory(Settings.INITIAL_PLAYER_HOTBAR_SIZE, 1, InventoryName.hotbar));
   const [heldItemSlot, setHeldItemSlot] = useState(new Inventory(1, 1, InventoryName.heldItemSlot));
   
   const summonPacketRef = useRef<Mutable<EntitySummonPacket> | null>(null);

   const placeEntity = useCallback((e: MouseEvent): void => {
      if (interactState !== GameInteractState.summonEntity) {
         return;
      }

      const summonPacket = summonPacketRef.current;
      if (summonPacket === null) {
         console.warn("summon packet is null");
         return;
      }
      
      if (e.button === 0) {
         const x = calculateCursorWorldPositionX(e.clientX)!;
         const y = calculateCursorWorldPositionY(e.clientY)!;
         
         // @Hack
         sendEntitySummonPacket(summonPacket.entityType, x, y, 2 * Math.PI * Math.random());
      } else if (e.button === 2) {
         // Get out of summon entity mode
         setInteractState(GameInteractState.none);
      }
      return;
   }, [interactState]);

   useEffect(() => {
      openSettingsMenu = (): void => setSettingsIsOpen(true);
      closeSettingsMenu = (): void => setSettingsIsOpen(false);

      gameScreenSetIsDead = setIsDead;
   }, []);

   useEffect(() => {
      GameScreen_update = (): void => {
         if (playerInstance !== null) {
            const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
            
            const entityHotbar = getInventory(inventoryComponent, InventoryName.hotbar);
            if (entityHotbar !== null && inventoriesAreDifferent(hotbar, entityHotbar)) {
               setHotbar(copyInventory(entityHotbar));
            }
            
            const entityHeldItemSlot = getInventory(inventoryComponent, InventoryName.heldItemSlot);
            if (entityHeldItemSlot !== null && inventoriesAreDifferent(heldItemSlot, entityHeldItemSlot)) {
               setHeldItemSlot(copyInventory(entityHeldItemSlot));
            }
         }
      }
   }, [hotbar, heldItemSlot]);

   useEffect(() => {
      if (cinematicModeIsEnabled) {
         toggleCinematicMode = () => {
            setCinematicModeIsEnabled(false);
         }
      } else {
         toggleCinematicMode = () => {
            setCinematicModeIsEnabled(true);
         }
      }
   }, [cinematicModeIsEnabled]);

   toggleSettingsMenu = useCallback(() => {
      settingsIsOpen ? closeSettingsMenu() : openSettingsMenu();
   }, [settingsIsOpen]);
   
   return <>
      <GameInteractableLayer hotbar={hotbar} heldItemSlot={heldItemSlot} cinematicModeIsEnabled={cinematicModeIsEnabled} />
   
      <ChatBox />

      {!cinematicModeIsEnabled ? <>
         <HealthBar isDead={isDead} />
         <Infocards />
      </> : undefined}

      {/* Note: BackpackInventoryMenu must be exactly before CraftingMenu because of CSS hijinks */}
      <BackpackInventoryMenu />
      <CraftingMenu />

      {isDead ? (
         <DeathScreen setAppState={props.setAppState} />
      ) : undefined}

      {interactState !== GameInteractState.summonEntity ? (
         <NerdVision summonPacketRef={summonPacketRef} setGameInteractState={setInteractState} />
      ) : <>
         <div id="summon-prompt">
            <div className="line left"></div>
            <h2>Click to spawn</h2>
            <div className="line right"></div>
         </div>

         <SummonCrosshair />

         <div id="summon-entity-veil" onMouseDown={e => placeEntity(e.nativeEvent)}></div>
      </>}

      <TechTree />
      <TechInfocard />

      <BuildMenu />

      <InventorySelector />

      <InspectHealthBar />
   </>;
}

export default GameScreen;