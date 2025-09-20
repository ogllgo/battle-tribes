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
import HealthInspector from "./HealthInspector";
import Infocards from "./infocards/Infocards";
import SummonCrosshair from "./SummonCrosshair";
import { AppState } from "../App";
import { EntitySummonPacket } from "../../../../shared/src/dev-packets";
import { Mutable, randAngle } from "../../../../shared/src/utils";
import { calculateCursorWorldPositionX, calculateCursorWorldPositionY } from "../../mouse";
import GameInteractableLayer from "./GameInteractableLayer";
import { sendEntitySummonPacket } from "../../networking/packet-creation";
import { copyInventory, Inventory, InventoryName } from "../../../../shared/src/items/items";
import { Settings } from "../../../../shared/src/settings";
import { getCurrentLayer, surfaceLayer, undergroundLayer } from "../../world";
import { getInventory, InventoryComponentArray } from "../../entity-components/server-components/InventoryComponent";
import { inventoriesAreDifferent } from "../../inventory-manipulation";
import LayerChangeMessage from "./LayerChangeMessage";
import { getHitboxTile, TransformComponentArray } from "../../entity-components/server-components/TransformComponent";
import { TileType } from "../../../../shared/src/tiles";
import TribePlanVisualiser from "./tribe-plan-visualiser/TribePlanVisualiser";
import { ItemTooltip } from "./inventories/ItemTooltip";
import AnimalStaffOptions from "./AnimalStaffOptions";
import { playerInstance } from "../../player";
import TamingMenu from "./taming-menu/TamingMenu";
import SignInscribeMenu from "./SignInscribeMenu";
import TamingRenamePrompt from "./taming-menu/TamingRenamePrompt";

export const enum GameInteractState {
   none,
   summonEntity,
   spectateEntity,
   selectCarryTarget,
   selectMoveTargetPosition,
   selectAttackTarget
}

export let openSettingsMenu: () => void;
export let closeSettingsMenu: () => void;
export let toggleSettingsMenu: () => void;

export let toggleCinematicMode: () => void;

export let gameScreenSetIsDead: (isDead: boolean) => void = () => {};

export let GameScreen_update: () => void = () => {};

// @Hack
export let GameScreen_getGameInteractState: () => GameInteractState = () => GameInteractState.none;

interface GameScreenProps {
   setAppState(appState: AppState): void;
}

// @CLEANUP @HACK only exists for a shit hack
const cloneEmptyInventory = (inventory: Inventory): Inventory => {
   return new Inventory(inventory.width, inventory.height, inventory.name);
}

const GameScreen = (props: GameScreenProps) => {
   const [settingsIsOpen, setSettingsIsOpen] = useState(false);
   const [isDead, setIsDead] = useState(false);
   const [cinematicModeIsEnabled, setCinematicModeIsEnabled] = useState(false);
   const [interactState, setInteractState] = useState(GameInteractState.none);

   const [hotbar, setHotbar] = useState(new Inventory(Settings.INITIAL_PLAYER_HOTBAR_SIZE, 1, InventoryName.hotbar));
   const [offhand, setOffhand] = useState(new Inventory(1, 1, InventoryName.offhand));
   const [heldItemSlot, setHeldItemSlot] = useState(new Inventory(1, 1, InventoryName.heldItemSlot));
   const [craftingOutputSlot, setCraftingOutputSlot] = useState(new Inventory(1, 1, InventoryName.craftingOutputSlot));
   const [backpack, setBackpack] = useState(new Inventory(1, 1, InventoryName.backpack));
   const [backpackSlot, setBackpackSlot] = useState(new Inventory(1, 1, InventoryName.backpackSlot));
   const [armourSlot, setArmourSlot] = useState(new Inventory(1, 1, InventoryName.armourSlot));
   const [gloveSlot, setGloveSlot] = useState(new Inventory(1, 1, InventoryName.gloveSlot));

   const [canAscendLayer, setCanAscendLayer] = useState(false);
   
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
         sendEntitySummonPacket(summonPacket.entityType, x, y, randAngle());
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
      GameScreen_getGameInteractState = () => interactState;
   }, [interactState]);

   useEffect(() => {
      GameScreen_update = (): void => {
         // @Copynpaste throughout all of this

         let entityHotbar: Inventory | null;
         let entityOffhand: Inventory | null;
         let entityHeldItemSlot: Inventory | null;
         let entityCraftingOutputSlot: Inventory | null;
         let entityBackpack: Inventory | null;
         let entityBackpackSlot: Inventory | null;
         let entityArmourSlot: Inventory | null;
         let entityGloveSlot: Inventory | null;
         if (playerInstance !== null) {
            const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
            entityHotbar = getInventory(inventoryComponent, InventoryName.hotbar);
            entityOffhand = getInventory(inventoryComponent, InventoryName.offhand);
            entityHeldItemSlot = getInventory(inventoryComponent, InventoryName.heldItemSlot);
            entityCraftingOutputSlot = getInventory(inventoryComponent, InventoryName.craftingOutputSlot);
            entityBackpack = getInventory(inventoryComponent, InventoryName.backpack);
            entityBackpackSlot = getInventory(inventoryComponent, InventoryName.backpackSlot);
            entityArmourSlot = getInventory(inventoryComponent, InventoryName.armourSlot);
            entityGloveSlot = getInventory(inventoryComponent, InventoryName.gloveSlot);
         } else {
            entityHotbar = cloneEmptyInventory(hotbar);
            entityOffhand = cloneEmptyInventory(offhand);
            entityHeldItemSlot = cloneEmptyInventory(heldItemSlot);
            entityCraftingOutputSlot = cloneEmptyInventory(craftingOutputSlot);
            entityBackpack = cloneEmptyInventory(backpack);
            entityBackpackSlot = cloneEmptyInventory(backpackSlot);
            entityArmourSlot = cloneEmptyInventory(armourSlot);
            entityGloveSlot = cloneEmptyInventory(gloveSlot);
         }
            
         if (entityHotbar !== null && inventoriesAreDifferent(hotbar, entityHotbar)) {
            setHotbar(copyInventory(entityHotbar));
         }
         if (entityOffhand !== null && inventoriesAreDifferent(offhand, entityOffhand)) {
            setOffhand(copyInventory(entityOffhand));
         }
         if (entityHeldItemSlot !== null && inventoriesAreDifferent(heldItemSlot, entityHeldItemSlot)) {
            setHeldItemSlot(copyInventory(entityHeldItemSlot));
         }
         if (entityCraftingOutputSlot !== null && inventoriesAreDifferent(craftingOutputSlot, entityCraftingOutputSlot)) {
            setCraftingOutputSlot(copyInventory(entityCraftingOutputSlot));
         }
         if (entityBackpack !== null && inventoriesAreDifferent(backpack, entityBackpack)) {
            setBackpack(copyInventory(entityBackpack));
         }
         if (entityBackpackSlot !== null && inventoriesAreDifferent(backpackSlot, entityBackpackSlot)) {
            setBackpackSlot(copyInventory(entityBackpackSlot));
         }
         if (entityArmourSlot !== null && inventoriesAreDifferent(armourSlot, entityArmourSlot)) {
            setArmourSlot(copyInventory(entityArmourSlot));
         }
         if (entityGloveSlot !== null && inventoriesAreDifferent(gloveSlot, entityGloveSlot)) {
            setGloveSlot(copyInventory(entityGloveSlot));
         }

         // @Cleanup wtf is this why is this here
         if (playerInstance !== null) {
            let canAscendLayer = false;
            if (getCurrentLayer() === undergroundLayer) {
               const transformComponent = TransformComponentArray.getComponent(playerInstance);
               const hitbox = transformComponent.hitboxes[0];
               const tileAbove = getHitboxTile(surfaceLayer, hitbox);
               if (tileAbove.type === TileType.dropdown) {
                  canAscendLayer = true;
               }
            }
            setCanAscendLayer(canAscendLayer);
         }
      }
   }, [hotbar, offhand, heldItemSlot, craftingOutputSlot, backpack, backpackSlot, armourSlot, gloveSlot]);

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
      <GameInteractableLayer hotbar={hotbar} offhand={offhand} backpackSlot={backpackSlot} armourSlot={armourSlot} gloveSlot={gloveSlot} heldItemSlot={heldItemSlot} cinematicModeIsEnabled={cinematicModeIsEnabled} gameInteractState={interactState} setGameInteractState={setInteractState} />
   
      <ChatBox />

      {!cinematicModeIsEnabled ? <>
         <HealthBar isDead={isDead} />
         <Infocards />
      </> : undefined}

      {/* Note: BackpackInventoryMenu must be exactly before CraftingMenu because of CSS hijinks */}
      <BackpackInventoryMenu />
      <CraftingMenu craftingOutputSlot={craftingOutputSlot} hotbar={hotbar} backpack={backpack} />

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

      <TribePlanVisualiser />

      <BuildMenu />

      <InventorySelector />

      <HealthInspector />

      <ItemTooltip />

      <AnimalStaffOptions setGameInteractState={setInteractState} />

      <TamingMenu />
      <TamingRenamePrompt />

      <SignInscribeMenu />

      { canAscendLayer ? (
         <LayerChangeMessage />
      ) : null }
   </>;
}

export default GameScreen;