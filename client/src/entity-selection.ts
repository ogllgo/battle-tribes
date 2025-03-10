import { Entity, EntityType, PlantedEntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { TunnelDoorSide } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import Game from "./Game";
import Board from "./Board";
import Client from "./networking/Client";
import { latencyGameState } from "./game-state/game-states";
import { BuildMenu_hide, BuildMenu_setBuildingID, BuildMenu_updateBuilding, entityCanOpenBuildMenu, isHoveringInBlueprintMenu } from "./components/game/BuildMenu";
import { InventoryMenuType, InventorySelector_inventoryIsOpen, InventorySelector_setInventoryMenuType } from "./components/game/inventories/InventorySelector";
import { GhostInfo, GhostType, PARTIAL_OPACITY } from "./rendering/webgl/entity-ghost-rendering";
import { CraftingMenu_setCraftingStation, CraftingMenu_setIsVisible } from "./components/game/menus/CraftingMenu";
import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { ItemType, InventoryName, ITEM_INFO_RECORD } from "battletribes-shared/items/items";
import { boxIsWithinRange, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { getPlayerSelectedItem } from "./components/game/GameInteractableLayer";
import { entityExists, getEntityLayer, getEntityRenderInfo, getEntityType } from "./world";
import { TombstoneComponentArray } from "./entity-components/server-components/TombstoneComponent";
import { TunnelComponentArray } from "./entity-components/server-components/TunnelComponent";
import { PlanterBoxComponentArray } from "./entity-components/server-components/PlanterBoxComponent";
import { CraftingStationComponentArray } from "./entity-components/server-components/CraftingStationComponent";
import { getLimbByInventoryName, InventoryUseComponentArray } from "./entity-components/server-components/InventoryUseComponent";
import { entityChildIsHitbox, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { TribeComponentArray } from "./entity-components/server-components/TribeComponent";
import { playerTribe } from "./tribes";
import { sendMountCarrySlotPacket, sendPickUpArrowPacket, sendStructureInteractPacket, sendModifyBuildingPacket, sendSetCarryTargetPacket, sendSetAttackTargetPacket } from "./networking/packet-creation";
import { AnimalStaffCommandType, AnimalStaffOptions_isHovering, AnimalStaffOptions_setEntity, AnimalStaffOptions_setIsVisible, createControlCommandParticles } from "./components/game/AnimalStaffOptions";
import { EntityRenderInfo } from "./EntityRenderInfo";
import { RideableComponentArray } from "./entity-components/server-components/RideableComponent";
import TexturedRenderPart from "./render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "./texture-atlases/texture-atlases";
import { GameInteractState } from "./components/game/GameScreen";
import { playerInstance } from "./player";
import { HealthComponentArray } from "./entity-components/server-components/HealthComponent";
import { TamingMenu_setEntity, TamingMenu_setVisibility } from "./components/game/TamingMenu";
import { addMenuCloseFunction } from "./menus";
import { entityIsTameableByPlayer } from "./entity-components/server-components/TamingComponent";
import { createHitbox, Hitbox } from "./hitboxes";
import CircularBox from "../../shared/src/boxes/CircularBox";
import { DEFAULT_COLLISION_MASK, HitboxCollisionBit } from "../../shared/src/collision";

const enum Vars {
   DEFAULT_INTERACT_RANGE = 150
}

const enum InteractActionType {
   openBuildMenu,
   plantSeed,
   useFertiliser,
   toggleTunnelDoor,
   startResearching,
   toggleDoor,
   openInventory,
   openCraftingStation,
   openAnimalStaffMenu,
   mountCarrySlot,
   pickUpArrow,
   setCarryTarget,
   selectAttackTarget,
   openTamingMenu
}

interface BaseInteractAction {
   readonly type: InteractActionType;
   readonly interactEntity: Entity;
   readonly interactRange: number;
}

interface OpenBuildMenuAction extends BaseInteractAction {
   readonly type: InteractActionType.openBuildMenu;
}

interface PlantSeedAction extends BaseInteractAction {
   readonly type: InteractActionType.plantSeed;
   readonly plantedEntityType: PlantedEntityType;
}

interface UseFertiliserAction extends BaseInteractAction {
   readonly type: InteractActionType.useFertiliser;
}

interface ToggleTunnelDoorAction extends BaseInteractAction {
   readonly type: InteractActionType.toggleTunnelDoor;
   readonly doorSide: TunnelDoorSide;
}

interface StartResearchingAction extends BaseInteractAction {
   readonly type: InteractActionType.startResearching;
}

interface ToggleDoorAction extends BaseInteractAction {
   readonly type: InteractActionType.toggleDoor;
}

interface OpenInventoryAction extends BaseInteractAction {
   readonly type: InteractActionType.openInventory;
   readonly inventoryMenuType: InventoryMenuType;
}

interface OpenCraftingMenuAction extends BaseInteractAction {
   readonly type: InteractActionType.openCraftingStation;
   readonly craftingStation: CraftingStation;
}

interface OpenAnimalStaffMenuAction extends BaseInteractAction {
   readonly type: InteractActionType.openAnimalStaffMenu;
}

interface MountCarrySlotAction extends BaseInteractAction {
   readonly type: InteractActionType.mountCarrySlot;
}

interface PickUpArrowAction extends BaseInteractAction {
   readonly type: InteractActionType.pickUpArrow;
}

interface SetCarryTargetAction extends BaseInteractAction {
   readonly type: InteractActionType.setCarryTarget;
}

interface SelectAttackTargetAction extends BaseInteractAction {
   readonly type: InteractActionType.selectAttackTarget;
}

interface OpenTamingMenuAction extends BaseInteractAction {
   readonly type: InteractActionType.openTamingMenu;
}

type InteractAction = OpenBuildMenuAction | PlantSeedAction | UseFertiliserAction | ToggleTunnelDoorAction | StartResearchingAction | ToggleDoorAction | OpenInventoryAction | OpenCraftingMenuAction | OpenAnimalStaffMenuAction | MountCarrySlotAction | PickUpArrowAction | SetCarryTargetAction | SelectAttackTargetAction | OpenTamingMenuAction;

const HIGHLIGHT_CURSOR_RANGE = 75;

// @Cleanup: should we merge hovered and highlighted? having two very similar ones is confusing.
let hoveredEntityID = -1;
let highlightedEntity = -1;
let selectedEntityID = -1;
/** The render info which an outline will be rendered around. */
let highlightedRenderInfo: EntityRenderInfo | null = null;

const SEED_TO_PLANT_RECORD: Partial<Record<ItemType, PlantedEntityType>> = {
   [ItemType.seed]: EntityType.treePlanted,
   [ItemType.berry]: EntityType.berryBushPlanted,
   [ItemType.frostcicle]: EntityType.iceSpikesPlanted
};

export function getHighlightedRenderInfo(): EntityRenderInfo | null {
   return highlightedRenderInfo;
}

const getInventoryMenuType = (entity: Entity): InventoryMenuType | null => {
   // First make sure that the entity's inventory can be accessed by the player.
   if (TribeComponentArray.hasComponent(entity)) {
      const tribeComponent = TribeComponentArray.getComponent(entity);
      if (tribeComponent.tribeID !== playerTribe.id) {
         return null;
      }
   }

   switch (getEntityType(entity)) {
      case EntityType.barrel: return InventoryMenuType.barrel;
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior: return InventoryMenuType.tribesman;
      case EntityType.campfire: return InventoryMenuType.campfire;
      case EntityType.furnace: return InventoryMenuType.furnace;
      case EntityType.tombstone: {
         const tombstoneComponent = TombstoneComponentArray.getComponent(entity);
         if (tombstoneComponent.deathInfo !== null) {
            return InventoryMenuType.tombstone;
         } else {
            return InventoryMenuType.none;
         }
      }
      case EntityType.ballista: return InventoryMenuType.ammoBox;
      default: return null;
   }
}

const getTunnelDoorSide = (groupNum: number): TunnelDoorSide => {
   switch (groupNum) {
      case 1: return 0b01;
      case 2: return 0b10;
      default: throw new Error();
   }
}

const getEntityInteractAction = (gameInteractState: GameInteractState, entity: Entity): InteractAction | null => {
   const selectedItem = getPlayerSelectedItem();

   if (gameInteractState === GameInteractState.selectCarryTarget) {
      const entityType = getEntityType(entity);
      // @Hack
      if (entityType !== EntityType.tree && entityType !== EntityType.boulder) {
         return {
            type: InteractActionType.setCarryTarget,
            interactEntity: entity,
            interactRange: Number.MAX_SAFE_INTEGER
         };
      }
   }
   if (gameInteractState === GameInteractState.selectAttackTarget) {
      if (HealthComponentArray.hasComponent(entity)) {
         return {
            type: InteractActionType.selectAttackTarget,
            interactEntity: entity,
            interactRange: Number.MAX_SAFE_INTEGER
         };
      }
   }

   // Toggle tunnel doors
   if (TunnelComponentArray.hasComponent(entity)) {
      return {
         type: InteractActionType.toggleTunnelDoor,
         interactEntity: entity,
         interactRange: Vars.DEFAULT_INTERACT_RANGE,
         // @HACK: GROUP NUM PARAMETER IS OBSOLETE
         doorSide: getTunnelDoorSide(0)
      };
   }

   // Use fertiliser / plant seeds
   if (selectedItem !== null && PlanterBoxComponentArray.hasComponent(entity)) {
      const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);

      // If holding fertiliser, try to fertilise the planter box
      if (selectedItem.type === ItemType.fertiliser && planterBoxComponent.hasPlant && !planterBoxComponent.isFertilised) {
         return {
            type: InteractActionType.useFertiliser,
            interactEntity: entity,
            interactRange: Vars.DEFAULT_INTERACT_RANGE
         };
      }
      
      // If holding a plant, try to place the seed in the planter box
      const plant = SEED_TO_PLANT_RECORD[selectedItem.type];
      if (typeof plant !== "undefined" && !planterBoxComponent.hasPlant) {
         return {
            type: InteractActionType.plantSeed,
            interactEntity: entity,
            interactRange: Vars.DEFAULT_INTERACT_RANGE,
            plantedEntityType: plant
         };
      }
   }
   
   // See if the entity can be used in the build menu
   if (entityCanOpenBuildMenu(entity)) {
      return {
         type: InteractActionType.openBuildMenu,
         interactEntity: entity,
         interactRange: Vars.DEFAULT_INTERACT_RANGE
      };
   }

   // Start researching
   const entityType = getEntityType(entity);
   if (entityType === EntityType.researchBench) {
      return {
         type: InteractActionType.startResearching,
         interactEntity: entity,
         interactRange: Vars.DEFAULT_INTERACT_RANGE
      };
   }

   // Toggle door
   if (entityType === EntityType.door || entityType === EntityType.fenceGate) {
      return {
         type: InteractActionType.toggleDoor,
         interactEntity: entity,
         interactRange: Vars.DEFAULT_INTERACT_RANGE
      };
   }

   // Crafting stations
   if (CraftingStationComponentArray.hasComponent(entity)) {
      const craftingStationComponent = CraftingStationComponentArray.getComponent(entity);
      return {
         type: InteractActionType.openCraftingStation,
         interactEntity: entity,
         interactRange: Vars.DEFAULT_INTERACT_RANGE,
         craftingStation: craftingStationComponent.craftingStation
      };
   }

   // Animal staff options
   if (selectedItem !== null && selectedItem.type === ItemType.animalStaff && entityIsTameableByPlayer(entity)) {
      return {
         type: InteractActionType.openAnimalStaffMenu,
         interactEntity: entity,
         interactRange: ITEM_INFO_RECORD[ItemType.animalStaff].controlRange
      };
   }

   // Taming almanac
   if (selectedItem !== null && selectedItem.type === ItemType.tamingAlmanac && entityIsTameableByPlayer(entity)) {
      return {
         type: InteractActionType.openTamingMenu,
         interactEntity: entity,
         interactRange: Vars.DEFAULT_INTERACT_RANGE
      };
   // Rideable entities
   } else if (RideableComponentArray.hasComponent(entity)) {
      const rideableComponent = RideableComponentArray.getComponent(entity);
      const carrySlot = rideableComponent.carrySlots[0];
      if (!entityExists(carrySlot.occupiedEntity)) {
         return {
            type: InteractActionType.mountCarrySlot,
            interactEntity: entity,
            interactRange: Vars.DEFAULT_INTERACT_RANGE
         };
      }
   }

   // Pick up arrows
   if (entityType === EntityType.woodenArrow) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.children[0] as Hitbox;
      if (hitbox.velocity.length() < 1) {
         return {
            type: InteractActionType.pickUpArrow,
            interactEntity: entity,
            interactRange: Vars.DEFAULT_INTERACT_RANGE
         };
      }
   }

   const inventoryMenuType = getInventoryMenuType(entity);
   if (inventoryMenuType !== null) {
      return {
         type: InteractActionType.openInventory,
         interactEntity: entity,
         interactRange: Vars.DEFAULT_INTERACT_RANGE,
         inventoryMenuType: inventoryMenuType
      };
   }
   
   return null;
}

const createInteractRenderInfo = (interactAction: InteractAction): EntityRenderInfo => {
   switch (interactAction.type) {
      case InteractActionType.openBuildMenu:
      case InteractActionType.plantSeed:
      case InteractActionType.useFertiliser:
      case InteractActionType.toggleTunnelDoor:
      case InteractActionType.startResearching:
      case InteractActionType.toggleDoor:
      case InteractActionType.openInventory:
      case InteractActionType.openCraftingStation:
      case InteractActionType.openAnimalStaffMenu:
      case InteractActionType.pickUpArrow:
      case InteractActionType.setCarryTarget:
      case InteractActionType.selectAttackTarget:
      case InteractActionType.openTamingMenu: {
         return getEntityRenderInfo(interactAction.interactEntity);
      }
      case InteractActionType.mountCarrySlot: {
         const transformComponent = TransformComponentArray.getComponent(interactAction.interactEntity);
         const interactEntityHitbox = transformComponent.children[0] as Hitbox;
         
         const renderInfo = new EntityRenderInfo(0, 0, 0, 1);

         const rideableComponent = RideableComponentArray.getComponent(interactAction.interactEntity);
         const carrySlot = rideableComponent.carrySlots[0];

         // @HACK
         const box = new CircularBox(interactEntityHitbox.box.position.copy(), new Point(0, 0), interactEntityHitbox.box.angle, 0);
         const hitbox = createHitbox(0, null, box, new Point(0, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_COLLISION_MASK, []);

         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex("entities/miscellaneous/carry-slot.png")
         );
         renderPart.offset.x = carrySlot.offsetX;
         renderPart.offset.y = carrySlot.offsetY;
         renderInfo.attachRenderPart(renderPart);
         
         return renderInfo;
      }
      default: {
         const unreachable: never = interactAction;
         return unreachable;
      }
   }
}

const interactWithEntity = (setGameInteractState: (state: GameInteractState) => void, entity: Entity, action: InteractAction): void => {
   switch (action.type) {
      case InteractActionType.openBuildMenu: {
         // Select the entity and open the build menu
         selectedEntityID = entity;
         BuildMenu_setBuildingID(entity);
         BuildMenu_updateBuilding(entity);

         break;
      }
      case InteractActionType.plantSeed: {
         sendModifyBuildingPacket(highlightedEntity, action.plantedEntityType);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
         const hotbarUseInfo = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = Board.serverTicks;
         
         break;
      }
      case InteractActionType.useFertiliser: {
         sendModifyBuildingPacket(entity, -1);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
         const hotbarUseInfo = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = Board.serverTicks;

         break;
      }
      case InteractActionType.toggleTunnelDoor: {
         sendStructureInteractPacket(highlightedEntity, action.doorSide);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
         const hotbarUseInfo = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = Board.serverTicks;
         
         break;
      }
      case InteractActionType.startResearching: {
         selectedEntityID = entity;

         sendStructureInteractPacket(highlightedEntity, 0);
         break;
      }
      case InteractActionType.toggleDoor: {
         sendStructureInteractPacket(highlightedEntity, 0);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
         const hotbarUseInfo = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = Board.serverTicks;

         break;
      }
      case InteractActionType.openInventory: {
         selectedEntityID = entity;
         InventorySelector_setInventoryMenuType(action.inventoryMenuType);
         break;
      }
      case InteractActionType.openCraftingStation: {
         selectedEntityID = entity;
         CraftingMenu_setCraftingStation(action.craftingStation);
         CraftingMenu_setIsVisible(true);
         break;
      }
      case InteractActionType.openAnimalStaffMenu: {
         selectedEntityID = entity;
         AnimalStaffOptions_setIsVisible(true);
         AnimalStaffOptions_setEntity(highlightedEntity);
         break;
      }
      case InteractActionType.mountCarrySlot: {
         sendMountCarrySlotPacket(entity);
         break;
      }
      case InteractActionType.pickUpArrow: {
         sendPickUpArrowPacket(entity);
         break;
      }
      case InteractActionType.setCarryTarget: {
         sendSetCarryTargetPacket(getSelectedEntityID(), getHoveredEntityID());
         setGameInteractState(GameInteractState.none);
         createControlCommandParticles(AnimalStaffCommandType.carry);
         break;
      }
      case InteractActionType.selectAttackTarget: {
         sendSetAttackTargetPacket(getSelectedEntityID(), getHoveredEntityID());
         setGameInteractState(GameInteractState.none);
         createControlCommandParticles(AnimalStaffCommandType.attack);
         break;
      }
      case InteractActionType.openTamingMenu: {
         selectedEntityID = entity;
         TamingMenu_setEntity(entity);
         TamingMenu_setVisibility(true);

         addMenuCloseFunction(() => {
            deselectSelectedEntity();
            TamingMenu_setEntity(0);
            TamingMenu_setVisibility(false);
         });
         break;
      }
      default: {
         const unreachable: never = action;
         return unreachable;
      }
   }
}

export function getHoveredEntityID(): number {
   return hoveredEntityID;
}

export function getHighlightedEntityID(): number {
   return highlightedEntity;
}

export function getSelectedEntityID(): number {
   return selectedEntityID;
}

export function resetInteractableEntityIDs(): void {
   hoveredEntityID = -1;
   highlightedEntity = -1;
   selectedEntityID = -1;
}

export function getSelectedEntity(): Entity {
   if (!entityExists(selectedEntityID)) {
      throw new Error("Can't select: Entity with ID " + selectedEntityID + " doesn't exist");
   }
   return selectedEntityID;
}

export function deselectSelectedEntity(closeInventory: boolean = true): void {
   // Clear previous selected entity
   if (entityExists(selectedEntityID)) {
      Client.sendStructureUninteract(selectedEntityID);

      BuildMenu_hide();
      AnimalStaffOptions_setIsVisible(false);
   }

   selectedEntityID = -1;

   if (closeInventory) {
      InventorySelector_setInventoryMenuType(InventoryMenuType.none);
   }
}

export function deselectHighlightedEntity(): void {
   if (selectedEntityID === highlightedEntity) {
      deselectSelectedEntity();
   }

   highlightedEntity = -1;
}

// @Cleanup: name
const getEntityID = (gameInteractState: GameInteractState, doPlayerProximityCheck: boolean, doCanSelectCheck: boolean): number => {
   const playerTransformComponent = TransformComponentArray.getComponent(playerInstance!);
   const playerHitbox = playerTransformComponent.children[0] as Hitbox;
   const layer = getEntityLayer(playerInstance!);
   
   const minChunkX = Math.max(Math.floor((Game.cursorX! - HIGHLIGHT_CURSOR_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((Game.cursorX! + HIGHLIGHT_CURSOR_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((Game.cursorY! - HIGHLIGHT_CURSOR_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((Game.cursorY! + HIGHLIGHT_CURSOR_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const cursorPosition = new Point(Game.cursorX!, Game.cursorY!);

   let minDist = HIGHLIGHT_CURSOR_RANGE + 1.1;
   let entityID = -1;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const currentEntity of chunk.nonGrassEntities) {
            const interactAction = getEntityInteractAction(gameInteractState, currentEntity);
            if (doCanSelectCheck && interactAction === null) {
               continue;
            }

            const entityTransformComponent = TransformComponentArray.getComponent(currentEntity);
            if (doPlayerProximityCheck && doCanSelectCheck) {
               const entityHitbox = entityTransformComponent.children[0] as Hitbox;
               // @Incomplete: Should do it based on the distance from the closest hitbox rather than distance from player center
               if (playerHitbox.box.position.calculateDistanceBetween(entityHitbox.box.position) > interactAction!.interactRange) {
                  continue;
               }
            }
            
            // Distance from cursor
            for (const hitbox of entityTransformComponent.children) {
               if (entityChildIsHitbox(hitbox) && boxIsWithinRange(hitbox.box, cursorPosition, HIGHLIGHT_CURSOR_RANGE)) {
                  const distance = cursorPosition.calculateDistanceBetween(hitbox.box.position);
                  if (distance < minDist) {
                     minDist = distance;
                     entityID = currentEntity;
                  }
                  break;
               }
            }
         }
      }
   }

   return entityID;
}

const getPlantGhostType = (plantedEntityType: PlantedEntityType): GhostType => {
   switch (plantedEntityType) {
      case EntityType.treePlanted: {
         return GhostType.treeSeed;
      }
      case EntityType.berryBushPlanted: {
         return GhostType.berryBushSeed;
      }
      case EntityType.iceSpikesPlanted: {
         return GhostType.iceSpikesSeed;
      }
   }
}

// @Cleanup: setGhostInfo called at every return
// @CLEANUP: Alsmost completely useless?
const updateHighlightedEntity = (gameInteractState: GameInteractState, entity: Entity | null): void => {
   if (entity === null) {
      // @Incomplete
      // setGhostInfo(null);
      highlightedRenderInfo = null;
      return;
   }
   
   // @Speed: could just pass this in
   const interactAction = getEntityInteractAction(gameInteractState, entity);

   if (interactAction === null) {
      // @Incomplete
      // setGhostInfo(null);
      return;
   }

   highlightedRenderInfo = createInteractRenderInfo(interactAction);
   
   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = entityTransformComponent.children[0] as Hitbox;
   
   switch (interactAction.type) {
      case InteractActionType.plantSeed: {
         const ghostInfo: GhostInfo = {
            position: entityHitbox.box.position,
            rotation: entityHitbox.box.angle,
            ghostType: getPlantGhostType(interactAction.plantedEntityType),
            tint: [1, 1, 1],
            opacity: PARTIAL_OPACITY
         };
         // @Incomplete
         // setGhostInfo(ghostInfo);
         break;
      }
      case InteractActionType.useFertiliser: {
         const ghostInfo: GhostInfo = {
            position: entityHitbox.box.position,
            rotation: entityHitbox.box.angle,
            ghostType: GhostType.fertiliser,
            tint: [1, 1, 1],
            opacity: PARTIAL_OPACITY
         };
         // @Incomplete
         // setGhostInfo(ghostInfo);
         break;
      }
      default: {
         // @Incomplete
         // setGhostInfo(null);
         break;
      }
   }
}

export function updateHighlightedAndHoveredEntities(gameInteractState: GameInteractState): void {
   if (Game.cursorX === null || Game.cursorY === null) {
      return;
   }

   // @Hack
   if (playerInstance === null) {
      hoveredEntityID = -1;
      return;
   }

   // @Cleanup: This is a pretty messy function: has 3 different scenarios, only separated by guards. Maybe refactor?

   // @Hack?
   if (latencyGameState.playerIsPlacingEntity) {
      // When the player is placing an entity, we don't want them to be able to select entities.
      deselectHighlightedEntity();
      hoveredEntityID = getEntityID(gameInteractState, false, false);
      return;
   }

   // @Hack
   // If the player is interacting with an inventory, only consider the distance from the player not the cursor
   if (playerInstance !== null && entityExists(selectedEntityID) && (isHoveringInBlueprintMenu() || InventorySelector_inventoryIsOpen() || AnimalStaffOptions_isHovering())) {
      hoveredEntityID = getEntityID(gameInteractState, false, false);
      return;
   }

   hoveredEntityID = getEntityID(gameInteractState, false, false);

   const newHighlightedEntityID = getEntityID(gameInteractState, true, true);
   if (newHighlightedEntityID !== highlightedEntity) {
      // Special case: when the game is in the select carry target interact state, we want the selected cow to remain selected even as the player highlights other entities
      if (gameInteractState !== GameInteractState.selectCarryTarget && gameInteractState !== GameInteractState.selectAttackTarget && gameInteractState !== GameInteractState.selectMoveTargetPosition) {
         // @Incomplete
         // setGhostInfo(null);
         deselectHighlightedEntity();
      }
      highlightedEntity = newHighlightedEntityID;
   }

   updateHighlightedEntity(gameInteractState, entityExists(highlightedEntity) ? highlightedEntity : null);
}

export function attemptEntitySelection(gameInteractState: GameInteractState, setGameInteractState: (state: GameInteractState) => void): boolean {
   if (!entityExists(highlightedEntity)) {
      // When a new entity is selected, deselect the previous entity
      deselectSelectedEntity();
      return false;
   }

   const interactAction = getEntityInteractAction(gameInteractState, highlightedEntity);
   if (interactAction !== null) {
      interactWithEntity(setGameInteractState, highlightedEntity, interactAction);
      return true;
   }

   return false;
}

export function updateSelectedEntity(gameInteractState: GameInteractState): void {
   // When the game is in select carry target mode, we want the controlled entity to remain selected
   if (gameInteractState !== GameInteractState.selectCarryTarget && gameInteractState !== GameInteractState.selectAttackTarget && gameInteractState !== GameInteractState.selectMoveTargetPosition && highlightedEntity === -1) {
      deselectSelectedEntity();
   }
}