import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import AttackChargeBar from "./AttackChargeBar";
import { LimbAction } from "../../../../shared/src/entities";
import { Item, InventoryName, getItemAttackInfo, ITEM_TYPE_RECORD, ItemType, ITEM_INFO_RECORD, ConsumableItemInfo, ConsumableItemCategory, PlaceableItemType, BowItemInfo, PlaceableItemInfo, Inventory, ITEM_TRAITS_RECORD } from "../../../../shared/src/items/items";
import { Settings } from "../../../../shared/src/settings";
import { STATUS_EFFECT_MODIFIERS } from "../../../../shared/src/status-effects";
import { calculateEntityPlaceInfo } from "../../../../shared/src/structures";
import { TribesmanTitle } from "../../../../shared/src/titles";
import { TribeType, TRIBE_INFO_RECORD } from "../../../../shared/src/tribes";
import Board, { getElapsedTimeInSeconds } from "../../Board";
import Camera from "../../Camera";
import Client from "../../networking/Client";
import { sendStopItemUsePacket, createAttackPacket, sendItemDropPacket, sendItemUsePacket, sendStartItemUsePacket, sendSpectateEntityPacket } from "../../networking/packet-creation";
import { DamageBoxComponentArray } from "../../entity-components/server-components/DamageBoxComponent";
import { createHealthComponentParams, HealthComponentArray } from "../../entity-components/server-components/HealthComponent";
import { createInventoryComponentParams, getInventory, InventoryComponentArray, updatePlayerHeldItem } from "../../entity-components/server-components/InventoryComponent";
import { getLimbByInventoryName, getLimbConfiguration, InventoryUseComponentArray, LimbInfo } from "../../entity-components/server-components/InventoryUseComponent";
import { attemptEntitySelection, getHoveredEntityID } from "../../entity-selection";
import { playBowFireSound } from "../../entity-tick-events";
import { latencyGameState, definiteGameState } from "../../game-state/game-states";
import { addKeyListener, keyIsPressed } from "../../keyboard-input";
import { closeCurrentMenu } from "../../menus";
import { addGhostRenderInfo, removeGhostRenderInfo } from "../../rendering/webgl/entity-ghost-rendering";
import { attemptToCompleteNode } from "../../research";
import { playSound } from "../../sound";
import { BackpackInventoryMenu_setIsVisible } from "./inventories/BackpackInventory";
import Hotbar, { Hotbar_updateLeftThrownBattleaxeItemID, Hotbar_updateRightThrownBattleaxeItemID, Hotbar_setHotbarSelectedItemSlot } from "./inventories/Hotbar";
import { CraftingMenu_setCraftingStation, CraftingMenu_setIsVisible } from "./menus/CraftingMenu";
import { createTransformComponentParams, HitboxTether, TransformComponentArray } from "../../entity-components/server-components/TransformComponent";
import { AttackVars, copyCurrentLimbState, copyLimbState, SHIELD_BASH_WIND_UP_LIMB_STATE, SHIELD_BLOCKING_LIMB_STATE, RESTING_LIMB_STATES, LimbConfiguration } from "../../../../shared/src/attack-patterns";
import { PhysicsComponentArray } from "../../entity-components/server-components/PhysicsComponent";
import { createEntity, EntityPreCreationInfo, EntityServerComponentParams, getCurrentLayer, getEntityLayer, playerInstance } from "../../world";
import { TribesmanComponentArray, tribesmanHasTitle } from "../../entity-components/server-components/TribesmanComponent";
import { createStatusEffectComponentParams, StatusEffectComponentArray } from "../../entity-components/server-components/StatusEffectComponent";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { EntityComponents, ServerComponentType, BuildingMaterial } from "../../../../shared/src/components";
import { ClientHitbox } from "../../boxes";
import { createBracingsComponentParams } from "../../entity-components/server-components/BracingsComponent";
import { createBuildingMaterialComponentParams } from "../../entity-components/server-components/BuildingMaterialComponent";
import { createStructureComponentParams } from "../../entity-components/server-components/StructureComponent";
import { TribeComponentArray, createTribeComponentParams } from "../../entity-components/server-components/TribeComponent";
import { thingIsVisualRenderPart } from "../../render-parts/render-parts";
import { createCookingComponentParams } from "../../entity-components/server-components/CookingComponent";
import { createCampfireComponentParams } from "../../entity-components/server-components/CampfireComponent";
import { createFurnaceComponentParams } from "../../entity-components/server-components/FurnaceComponent";
import { createSpikesComponentParams } from "../../entity-components/server-components/SpikesComponent";
import HeldItemSlot from "./HeldItemSlot";
import { createFireTorchComponentParams } from "../../entity-components/server-components/FireTorchComponent";
import { createSlurbTorchComponentParams } from "../../entity-components/server-components/SlurbTorchComponent";
import { createBarrelComponentParams } from "../../entity-components/server-components/BarrelComponent";
import { playerTribe } from "../../tribes";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createResearchBenchComponentParams } from "../../entity-components/server-components/ResearchBenchComponent";
import { GameInteractState } from "./GameScreen";

export interface ItemRestTime {
   remainingTimeTicks: number;
   durationTicks: number;
}

interface GameInteractableLayerProps {
   readonly hotbar: Inventory;
   readonly offhand: Inventory;
   readonly backpackSlot: Inventory;
   readonly armourSlot: Inventory;
   readonly gloveSlot: Inventory;
   readonly heldItemSlot: Inventory;
   readonly cinematicModeIsEnabled: boolean;
   readonly gameInteractState: GameInteractState;
   setGameInteractState(state: GameInteractState): void;
}

interface SelectedItemInfo {
   readonly item: Item;
   readonly itemSlot: number;
   readonly inventoryName: InventoryName;
}

const enum BufferedInputType {
   attack,
   block
}

/*
// @Temporary @Incomplete

      canPlace: (): boolean => {
         // The player can only place one tribe totem
         return !Game.tribe.hasTotem;
      },
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.worker_hut]: {
      entityType: EntityType.workerHut,
      width: WORKER_HUT_SIZE,
      height: WORKER_HUT_SIZE,
      canPlace: (): boolean => {
         return Game.tribe.hasTotem && Game.tribe.numHuts < Game.tribe.tribesmanCap;
      },
*/

/** Amount of time that attack/block inputs will be buffered */
const INPUT_COYOTE_TIME = 0.05;

/** Acceleration of the player while moving without any modifiers. */
const PLAYER_ACCELERATION = 700;

const PLAYER_LIGHTSPEED_ACCELERATION = 15000;

/** Acceleration of the player while slowed. */
const PLAYER_SLOW_ACCELERATION = 400;

/** Acceleration of the player for a brief period after being hit */
const PLAYER_DISCOMBOBULATED_ACCELERATION = 300;

export let rightMouseButtonIsPressed = false;

let hotbarSelectedItemSlot = 1;

   /** Whether the inventory is open or not. */
let _inventoryIsOpen = false;

let discombobulationTimer = 0;

/** If > 0, it counts down the remaining time that the attack is buffered. */
let attackBufferTime = 0;
let bufferedInputType = BufferedInputType.attack;
let bufferedInputInventory = InventoryName.hotbar;

let placeableEntityGhostRenderInfo: EntityRenderInfo | null = null;

const createItemRestTimes = (num: number): Array<ItemRestTime> => {
   const restTimes = new Array<ItemRestTime>();
   for (let i = 0; i < num; i++) {
      restTimes.push({
         remainingTimeTicks: 0,
         durationTicks: 0
      });
   }
   return restTimes;
}

// @Hack
let GameInteractableLayer_setChargeInfo: (inventoryName: InventoryName, elapsedTicks: number, duration: number) => void = () => {};

// @Hack
export let GameInteractableLayer_setItemRestTime: (inventoryName: InventoryName, itemSlot: number, restTimeTicks: number) => void = () => {};
// @Hack
let GameInteractableLayer_update: () => void = () => {};
// @Hack
let GameInteractableLayer_getHotbarRestTimes: () => Array<ItemRestTime> = () => [];

export function getHotbarSelectedItemSlot(): number {
   return hotbarSelectedItemSlot;
}

export function getInstancePlayerAction(inventoryName: InventoryName): LimbAction {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
   const limbInfo = getLimbByInventoryName(inventoryUseComponent, inventoryName);
   return limbInfo.action;
}

export function playerIsHoldingPlaceableItem(): boolean {
   if (playerInstance === null) {
      return false;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);

   const hotbarLimb = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
   if (hotbarLimb.heldItemType !== null && ITEM_TYPE_RECORD[hotbarLimb.heldItemType] === "placeable") {
      return true;
   }

   const offhandLimb = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
   if (offhandLimb.heldItemType !== null && ITEM_TYPE_RECORD[offhandLimb.heldItemType] === "placeable") {
      return true;
   }

   return false;
}

/** Distract blind target. Now, discombobulate. */
export function discombobulate(discombobulationTimeSeconds: number): void {
   if (discombobulationTimeSeconds > discombobulationTimer) {
      discombobulationTimer = discombobulationTimeSeconds;
   }
}

const hasBlockedAttack = (limb: LimbInfo): boolean => {
   const damageBoxComponent = DamageBoxComponentArray.getComponent(playerInstance!);

   for (const blockBox of damageBoxComponent.blockBoxes) {
      if (blockBox.associatedLimbInventoryName === limb.inventoryName && blockBox.hasBlocked) {
         return true;
      }
   }

   return false;
}

const itemIsResting = (itemSlot: number): boolean => {
   // @Hack
   const restTime = GameInteractableLayer_getHotbarRestTimes()[itemSlot - 1];
   return restTime.remainingTimeTicks > 0;
}

export function cancelAttack(limb: LimbInfo, limbConfiguration: LimbConfiguration): void {
   const attackInfo = getItemAttackInfo(limb.heldItemType);

   limb.action = LimbAction.returnAttackToRest;
   limb.currentActionElapsedTicks = 0;
   limb.currentActionDurationTicks = attackInfo.attackTimings.returnTimeTicks * getAttackTimeMultiplier(limb.heldItemType);

   limb.currentActionStartLimbState = limb.currentActionEndLimbState;
   // @Speed: Garbage collection
   limb.currentActionEndLimbState = copyLimbState(RESTING_LIMB_STATES[limbConfiguration]);
}

// @Cleanup: bad name. mostly updating limbs
export function updatePlayerItems(): void {
   if (playerInstance === null) {
      return;
   }

   discombobulationTimer -= Settings.I_TPS;
   if (discombobulationTimer < 0) {
      discombobulationTimer = 0;
   }

   // @Cleanup: Copynpaste for the action completion all over here. solution: make currentActionIsFinished method on Limb class

   for (let i = 0; i < 2; i++) {
      const inventoryName = i === 0 ? InventoryName.hotbar : InventoryName.offhand;
      const selectedItemSlot = i === 0 ? hotbarSelectedItemSlot : 1;
      
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);
      const limb = getLimbByInventoryName(inventoryUseComponent, inventoryName);

      if (limb.currentActionPauseTicksRemaining > 0) {
         limb.currentActionPauseTicksRemaining--;
      } else {
         limb.currentActionElapsedTicks += limb.currentActionRate;
      }

      // If the item is resting, the player isn't able to use it
      if (limb.action === LimbAction.block && itemIsResting(selectedItemSlot)) {
         const attackInfo = getItemAttackInfo(limb.heldItemType);
         
         // @Copynpaste

         limb.action = LimbAction.returnBlockToRest;
         limb.currentActionElapsedTicks = 0;
         // @Temporary? Perhaps use separate blockReturnTimeTicks.
         limb.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks!;
         // The shield did a block, so it returns to rest twice as fast
         limb.currentActionRate = 2;

         sendStopItemUsePacket();
      }
      
      // If finished winding attack, switch to doing attack
      if (limb.action === LimbAction.windAttack && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         const attackInfo = getItemAttackInfo(limb.heldItemType);

         const attackPattern = attackInfo.attackPatterns![getLimbConfiguration(inventoryUseComponent)];
         
         limb.action = LimbAction.attack;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = attackInfo.attackTimings.swingTimeTicks * getAttackTimeMultiplier(limb.heldItemType);

         // @Speed: Garbage collection
         limb.currentActionStartLimbState = copyLimbState(attackPattern.windedBack);
         // @Speed: Garbage collection
         limb.currentActionEndLimbState = copyLimbState(attackPattern.swung);

         const transformComponent = TransformComponentArray.getComponent(playerInstance);
         const physicsComponent = PhysicsComponentArray.getComponent(playerInstance);

         // Add extra range for moving attacks
         const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
         const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
         if (vx !== 0 || vy !== 0) {
            const velocityMagnitude = Math.sqrt(vx * vx + vy * vy);
            const attackAlignment = (vx * Math.sin(transformComponent.rotation) + vy * Math.cos(transformComponent.rotation)) / velocityMagnitude;
            if (attackAlignment > 0) {
               const extraAmount = AttackVars.MAX_EXTRA_ATTACK_RANGE * Math.min(velocityMagnitude / AttackVars.MAX_EXTRA_ATTACK_RANGE_SPEED);
               limb.currentActionEndLimbState.extraOffsetY += extraAmount;
            }
         }
      }

      // If finished attacking, go to rest
      if (limb.action === LimbAction.attack && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         cancelAttack(limb, getLimbConfiguration(inventoryUseComponent));
      }

      // If finished going to rest, set to default
      if (limb.action === LimbAction.returnAttackToRest && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.none;

         const attackInfo = getItemAttackInfo(limb.heldItemType);
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = attackInfo.attackTimings.restTimeTicks;
      }

      // If finished engaging block, go to block
      if (limb.action === LimbAction.engageBlock && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.block;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = 0;
      }

      // @Incomplete: Double-check there isn't a tick immediately after depressing the button where this hasn't registered in the limb yet
      // If blocking but not right clicking, return to rest
      if (limb.action === LimbAction.block && !rightMouseButtonIsPressed) {
         const attackInfo = getItemAttackInfo(limb.heldItemType);
         limb.action = LimbAction.returnBlockToRest;
         limb.currentActionElapsedTicks = 0;
         // @Temporary? Perhaps use separate blockReturnTimeTicks.
         limb.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks!;
         limb.currentActionRate = hasBlockedAttack(limb) ? 2 : 1;

         sendStopItemUsePacket();
      }

      // @Copynpaste
      // If finished returning block to rest, go to rest
      if (limb.action === LimbAction.returnBlockToRest && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.none;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = 0;
      }

      // If finished feigning attack, go to rest
      if (limb.action === LimbAction.feignAttack && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.none;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = 0;
      }

      if (limb.action === LimbAction.windShieldBash && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.pushShieldBash;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_PUSH_TIME_TICKS;
      }

      if (limb.action === LimbAction.pushShieldBash && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.returnShieldBashToRest;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_RETURN_TIME_TICKS;
      }

      if (limb.action === LimbAction.returnShieldBashToRest && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.block;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_RETURN_TIME_TICKS;
      }

      // Buffered attacks
      if (inventoryName === bufferedInputInventory && (attackBufferTime > 0 || (bufferedInputType === BufferedInputType.block && rightMouseButtonIsPressed))) {
         switch (bufferedInputType) {
            case BufferedInputType.attack: {
               if (limb.action === LimbAction.none && limb.currentActionElapsedTicks >= limb.currentActionDurationTicks) {
                  const didSwing = tryToSwing(inventoryName);
                  if (didSwing) {
                     attackBufferTime = 0;
                  }
               }
               break;
            }
            case BufferedInputType.block: {
               if (limb.action === LimbAction.none && limb.heldItemType !== null) {
                  onItemStartUse(limb.heldItemType, inventoryName, selectedItemSlot);
               }
               break;
            }
         }
         
         attackBufferTime -= Settings.I_TPS;
         if (attackBufferTime <= 0) {
            attackBufferTime = 0;
         }
      }

      // Update attack charge bar
      let attackElapsedTicks = -1;
      let attackDuration = -1;
      if (limb.action === LimbAction.windAttack || limb.action === LimbAction.attack || limb.action === LimbAction.returnAttackToRest || (limb.action === LimbAction.none && limb.currentActionDurationTicks > 0)) {
         const attackInfo = getItemAttackInfo(limb.heldItemType);

         switch (limb.action) {
            case LimbAction.windAttack: {
               attackElapsedTicks = limb.currentActionElapsedTicks;
               break;
            }
            case LimbAction.attack: {
               attackElapsedTicks = attackInfo.attackTimings.windupTimeTicks * getAttackTimeMultiplier(limb.heldItemType) + limb.currentActionElapsedTicks;
               break;
            }
            case LimbAction.returnAttackToRest: {
               attackElapsedTicks = (attackInfo.attackTimings.windupTimeTicks + attackInfo.attackTimings.swingTimeTicks) * getAttackTimeMultiplier(limb.heldItemType) + limb.currentActionElapsedTicks;
               break;
            }
            case LimbAction.none: {
               attackElapsedTicks = (attackInfo.attackTimings.windupTimeTicks + attackInfo.attackTimings.swingTimeTicks + attackInfo.attackTimings.returnTimeTicks) * getAttackTimeMultiplier(limb.heldItemType) + limb.currentActionElapsedTicks;
               break;
            }
         }

         attackDuration = (attackInfo.attackTimings.windupTimeTicks + attackInfo.attackTimings.swingTimeTicks + attackInfo.attackTimings.returnTimeTicks) * getAttackTimeMultiplier(limb.heldItemType) + attackInfo.attackTimings.restTimeTicks;
      } else {
         attackElapsedTicks = -1;
         attackDuration = -1;
      }
      // @Hack
      GameInteractableLayer_setChargeInfo(inventoryName, attackElapsedTicks, attackDuration);
   
      // Tick held item
      if (limb.heldItemType !== null) {
         tickItem(limb.heldItemType);
      }
   }

   // @Hack @Temporary
   GameInteractableLayer_update();
}

const tryToSwing = (inventoryName: InventoryName): boolean => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);

   const limb = getLimbByInventoryName(inventoryUseComponent, inventoryName);
   const attackInfo = getItemAttackInfo(limb.heldItemType);

   // Shield-bash
   if (attackInfo.attackPatterns === null) {
      if (limb.action === LimbAction.block) {
         limb.action = LimbAction.windShieldBash;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_WINDUP_TIME_TICKS;
         limb.currentActionRate = 1;

         // @Speed: Garbage collection
         limb.currentActionStartLimbState = copyLimbState(SHIELD_BLOCKING_LIMB_STATE);
         // @Speed: Garbage collection
         limb.currentActionEndLimbState = copyLimbState(SHIELD_BASH_WIND_UP_LIMB_STATE);

         const attackPacket = createAttackPacket();
         Client.sendPacket(attackPacket);
      }
      return false;
   }

   if (limb.action !== LimbAction.none || limb.currentActionElapsedTicks < limb.currentActionDurationTicks) {
      return false;
   }

   const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
   const attackPattern = attackInfo.attackPatterns[limbConfiguration];

   limb.action = LimbAction.windAttack;
   limb.currentActionElapsedTicks = 0;
   limb.currentActionDurationTicks = attackInfo.attackTimings.windupTimeTicks * getAttackTimeMultiplier(limb.heldItemType);
   limb.currentActionRate = 1;

   // @Speed: Garbage collection
   limb.currentActionStartLimbState = copyLimbState(RESTING_LIMB_STATES[limbConfiguration]);
   // @Speed: Garbage collection
   limb.currentActionEndLimbState = copyLimbState(attackPattern.windedBack);

   const attackPacket = createAttackPacket();
   Client.sendPacket(attackPacket);

   return true;
}

// @Cleanup: unused?
const getAttackTimeMultiplier = (itemType: ItemType | null): number => {
   let swingTimeMultiplier = 1;

   if (playerTribe.tribeType === TribeType.barbarians) {
      // 30% slower
      swingTimeMultiplier /= 0.7;
   }

   // Builders swing hammers 30% faster
   const tribesmanComponent = TribesmanComponentArray.getComponent(playerInstance!);
   if (tribesmanHasTitle(tribesmanComponent, TribesmanTitle.builder) && itemType !== null && ITEM_TYPE_RECORD[itemType] === "hammer") {
      swingTimeMultiplier /= 1.3;
   }

   return swingTimeMultiplier;
}

// @Incomplete
// const getBaseAttackCooldown = (item: Item | null, itemLimbInfo: LimbInfo, inventoryComponent: InventoryComponent): number => {
//    // @Hack
//    if (item === null || item.type === ItemType.leaf && inventoryComponent.hasInventory(InventoryName.gloveSlot)) {
//       const glovesInventory = inventoryComponent.getInventory(InventoryName.gloveSlot);

//       const gloves = glovesInventory.itemSlots[1];
//       if (typeof gloves !== "undefined" && gloves.type === ItemType.gardening_gloves) {
//          return Settings.DEFAULT_ATTACK_COOLDOWN * 1.5;
//       }
//    }
   
//    if (item === null) {
//       return Settings.DEFAULT_ATTACK_COOLDOWN;
//    }

//    const itemInfo = ITEM_INFO_RECORD[item.type];
//    if (itemInfoIsTool(item.type, itemInfo) && item.id !== itemLimbInfo.thrownBattleaxeItemID) {
//       return itemInfo.attackCooldown;
//    }

//    return Settings.DEFAULT_ATTACK_COOLDOWN;
// }

// @Incomplete
// const getItemAttackCooldown = (item: Item | null, itemLimbInfo: LimbInfo, inventoryComponent: InventoryComponent): number => {
//    let attackCooldown = getBaseAttackCooldown(item, itemLimbInfo, inventoryComponent);
//    attackCooldown *= getSwingTimeMultiplier(item);
//    return attackCooldown;
// }

const attemptAttack = (): void => {
   if (playerInstance === null) return;

   let attackDidSucceed = tryToSwing(InventoryName.hotbar);
   if (!attackDidSucceed && playerTribe.tribeType === TribeType.barbarians) {
      attackDidSucceed = tryToSwing(InventoryName.offhand);
   }

   if (!attackDidSucceed) {
      attackBufferTime = INPUT_COYOTE_TIME;
      bufferedInputType = BufferedInputType.attack;
      bufferedInputInventory = InventoryName.hotbar;
   }
}

export function getPlayerSelectedItem(): Item | null {
   if (playerInstance === null) return null;

   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar)!;
   return hotbarInventory.getItem(hotbarSelectedItemSlot);
}

/** Gets the selected item slot for an arbitrary inventory */
export function getPlayerSelectedItemSlot(inventoryName: InventoryName): number | null {
   switch (inventoryName) {
      case InventoryName.hotbar: {
         return hotbarSelectedItemSlot;
      }
      case InventoryName.offhand: {
         return 1;
      }
      default: {
         return null;
      }
   }
}

const getSelectedItemInfo = (): SelectedItemInfo | null => {
   if (playerInstance === null) {
      return null;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar)!;
   
   const heldItem = hotbarInventory.getItem(hotbarSelectedItemSlot);
   if (heldItem !== null) {
      return {
         item: heldItem,
         itemSlot: hotbarSelectedItemSlot,
         inventoryName: InventoryName.hotbar
      };
   }

   const offhand = getInventory(inventoryComponent, InventoryName.offhand)!;
   const offhandHeldItem = offhand.getItem(1);
   if (offhandHeldItem !== null) {
      return {
         item: offhandHeldItem,
         itemSlot: 1,
         inventoryName: InventoryName.offhand
      };
   }

   return null;
}

const onGameMouseUp = (e: React.MouseEvent): void => {
   if (playerInstance === null) return;

   if (e.button === 0) { // Left click
   } else if (e.button === 2) { // Right click
      rightMouseButtonIsPressed = false;

      const selectedItemInfo = getSelectedItemInfo();
      if (selectedItemInfo !== null) {
         onItemEndUse(selectedItemInfo.item, selectedItemInfo.inventoryName);
      }
   }
}

const createHotbarKeyListeners = (): void => {
   for (let itemSlot = 1; itemSlot <= Settings.INITIAL_PLAYER_HOTBAR_SIZE; itemSlot++) {
      addKeyListener(itemSlot.toString(), () => selectItemSlot(itemSlot));
   }
   addKeyListener("!", () => selectItemSlot(1));
   addKeyListener("@", () => selectItemSlot(2));
   addKeyListener("#", () => selectItemSlot(3));
   addKeyListener("$", () => selectItemSlot(4));
   addKeyListener("%", () => selectItemSlot(5));
   addKeyListener("^", () => selectItemSlot(6));
   addKeyListener("&", () => selectItemSlot(7));
}

const throwHeldItem = (): void => {
   if (playerInstance !== null) {
      const transformComponent = TransformComponentArray.getComponent(playerInstance);
      Client.sendHeldItemDropPacket(99999, transformComponent.rotation);
   }
}

const hideInventory = (): void => {
   _inventoryIsOpen = false;
   
   CraftingMenu_setCraftingStation(null);
   CraftingMenu_setIsVisible(false);
   BackpackInventoryMenu_setIsVisible(false);

   // If the player is holding an item when their inventory is closed, throw the item out
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
   const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot)!;
   if (heldItemInventory.hasItem(1)) {
      throwHeldItem();
   }
}
 
/** Creates the key listener to toggle the inventory on and off. */
const createInventoryToggleListeners = (): void => {
   addKeyListener("e", () => {
      const didCloseMenu = closeCurrentMenu();
      if (!didCloseMenu) {
         // Open the crafting menu
         CraftingMenu_setCraftingStation(null);
         CraftingMenu_setIsVisible(true);
      }
   });

   addKeyListener("i", () => {
      if (_inventoryIsOpen) {
         hideInventory();
         return;
      }
   });
   addKeyListener("escape", () => {
      closeCurrentMenu();
   });
}

/** Creates keyboard and mouse listeners for the player. */
export function createPlayerInputListeners(): void {
   createHotbarKeyListeners();
   createInventoryToggleListeners();

   document.body.addEventListener("wheel", e => {
      // Don't scroll hotbar if element is being scrolled instead
      const elemPath = e.composedPath() as Array<HTMLElement>;
      for (let i = 0; i < elemPath.length; i++) {
         const elem = elemPath[i];
         // @Hack
         if (typeof elem.style !== "undefined") {
            const overflowY = getComputedStyle(elem).getPropertyValue("overflow-y");
            if (overflowY === "scroll") {
               return;
            }
         }
      }
      
      const scrollDirection = Math.sign(e.deltaY);
      let newSlot = hotbarSelectedItemSlot + scrollDirection;
      if (newSlot <= 0) {
         newSlot += Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      } else if (newSlot > Settings.INITIAL_PLAYER_HOTBAR_SIZE) {
         newSlot -= Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      }
      selectItemSlot(newSlot);
   });

   addKeyListener("q", () => {
      if (playerInstance !== null) {
         const selectedItemInfo = getSelectedItemInfo();
         if (selectedItemInfo === null) {
            return;
         }

         const isOffhand = selectedItemInfo.inventoryName === InventoryName.offhand;
         const playerTransformComponent = TransformComponentArray.getComponent(playerInstance);
         const dropAmount = keyIsPressed("shift") ? 99999 : 1;
         sendItemDropPacket(isOffhand, hotbarSelectedItemSlot, dropAmount, playerTransformComponent.rotation);
      }
   });
}

const isCollidingWithCoveredSpikes = (): boolean => {
   // @Incomplete
   return false;
   
   // const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   
   // for (let i = 0; i < transformComponent.collidingEntities.length; i++) {
   //    const entity = transformComponent.collidingEntities[i];

   //    if (SpikesComponentArray.hasComponent(entity.id)) {
   //       const spikesComponent = SpikesComponentArray.getComponent(entity.id);
   //       if (spikesComponent.isCovered) {
   //          return true;
   //       }
   //    }
   // }

   // return false;
}

const getPlayerMoveSpeedMultiplier = (moveDirection: number): number => {
   let moveSpeedMultiplier = 1;

   const statusEffectComponent = StatusEffectComponentArray.getComponent(playerInstance!);
   for (const statusEffect of statusEffectComponent.statusEffects) {
      moveSpeedMultiplier *= STATUS_EFFECT_MODIFIERS[statusEffect.type].moveSpeedMultiplier;
   }

   moveSpeedMultiplier *= TRIBE_INFO_RECORD[playerTribe.tribeType].moveSpeedMultiplier;

   const tribesmanComponent = TribesmanComponentArray.getComponent(playerInstance!);
   if (tribesmanHasTitle(tribesmanComponent, TribesmanTitle.sprinter)) {
      moveSpeedMultiplier *= 1.2;
   }

   if (isCollidingWithCoveredSpikes()) {
      moveSpeedMultiplier *= 0.5;
   }

   const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   // Get how aligned the intended movement direction and the player's rotation are
   const directionAlignmentDot = Math.sin(moveDirection) * Math.sin(transformComponent.rotation) + Math.cos(moveDirection) * Math.cos(transformComponent.rotation);
   // Move 15% slower if you're accelerating away from where you're moving
   if (directionAlignmentDot < 0) {
      const reductionMultiplier = -directionAlignmentDot;
      moveSpeedMultiplier *= 1 - 0.15 * reductionMultiplier;
   }

   return moveSpeedMultiplier;
}

/** Updates the player's movement to match what keys are being pressed. */
export function updatePlayerMovement(): void {
   // Don't update movement if the player doesn't exist
   if (playerInstance === null) return;
   
   // Get pressed keys
   const wIsPressed = keyIsPressed("w") || keyIsPressed("W") || keyIsPressed("ArrowUp");
   const aIsPressed = keyIsPressed("a") || keyIsPressed("A") || keyIsPressed("ArrowLeft");
   const sIsPressed = keyIsPressed("s") || keyIsPressed("S") || keyIsPressed("ArrowDown");
   const dIsPressed = keyIsPressed("d") || keyIsPressed("D") || keyIsPressed("ArrowRight");

   const hash = (wIsPressed ? 1 : 0) + (aIsPressed ? 2 : 0) + (sIsPressed ? 4 : 0) + (dIsPressed ? 8 : 0);

   // Update rotation
   let moveDirection!: number | null;
   switch (hash) {
      case 0:  moveDirection = null;          break;
      case 1:  moveDirection = 0;             break;
      case 2:  moveDirection = Math.PI * 3/2; break;
      case 3:  moveDirection = Math.PI * 7/4; break;
      case 4:  moveDirection = Math.PI;       break;
      case 5:  moveDirection = null;          break;
      case 6:  moveDirection = Math.PI * 5/4; break;
      case 7:  moveDirection = Math.PI * 3/2; break;
      case 8:  moveDirection = Math.PI/2;     break;
      case 9:  moveDirection = Math.PI / 4;   break;
      case 10: moveDirection = null;          break;
      case 11: moveDirection = 0;             break;
      case 12: moveDirection = Math.PI * 3/4; break;
      case 13: moveDirection = Math.PI/2;     break;
      case 14: moveDirection = Math.PI;       break;
      case 15: moveDirection = null;          break;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(playerInstance);

   if (moveDirection !== null) {
      const playerAction = getInstancePlayerAction(InventoryName.hotbar);
      
      let acceleration: number;
      if (keyIsPressed("l")) {
         acceleration = PLAYER_LIGHTSPEED_ACCELERATION;
      // @Bug: doesn't account for offhand
      } else if (playerAction === LimbAction.eat || playerAction === LimbAction.useMedicine || playerAction === LimbAction.chargeBow || playerAction === LimbAction.chargeSpear || playerAction === LimbAction.loadCrossbow || playerAction === LimbAction.block || playerAction === LimbAction.windShieldBash || playerAction === LimbAction.pushShieldBash || playerAction === LimbAction.returnShieldBashToRest || latencyGameState.playerIsPlacingEntity) {
         acceleration = PLAYER_SLOW_ACCELERATION;
      } else {
         acceleration = PLAYER_ACCELERATION;
      }

      // If discombobulated, limit the acceleration to the discombobulated acceleration
      if (discombobulationTimer > 0 && acceleration > PLAYER_DISCOMBOBULATED_ACCELERATION) {
         acceleration = PLAYER_DISCOMBOBULATED_ACCELERATION;
      }

      acceleration *= getPlayerMoveSpeedMultiplier(moveDirection);

      if (latencyGameState.lastPlantCollisionTicks >= Board.serverTicks - 1) {
         acceleration *= 0.5;
      }
      
      physicsComponent.acceleration.x = acceleration * Math.sin(moveDirection);
      physicsComponent.acceleration.y = acceleration * Math.cos(moveDirection);
   } else {
      physicsComponent.acceleration.x = 0;
      physicsComponent.acceleration.y = 0;
   }
}

export function onItemSelect(itemType: ItemType): void {
   const itemCategory = ITEM_TYPE_RECORD[itemType];
   switch (itemCategory) {
      case "placeable": {
         const torchTrait = ITEM_TRAITS_RECORD[itemType].torch;
         if (typeof torchTrait === "undefined") {
            latencyGameState.playerIsPlacingEntity = true;
         }
         break;
      }
   }
}

export function onItemDeselect(itemType: ItemType, isOffhand: boolean): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
   const limb = inventoryUseComponent.limbInfos[isOffhand ? 1 : 0];

   const itemCategory = ITEM_TYPE_RECORD[itemType];
   switch (itemCategory) {
      case "healing": {
         unuseItem(itemType);
         break;
      }
      case "spear":
      case "battleaxe":
      case "bow": {
         limb.action = LimbAction.none;
         sendStopItemUsePacket();
         break;
      }
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = false;

         // Clear entity ghost
         if (placeableEntityGhostRenderInfo !== null) {
            removeGhostRenderInfo(placeableEntityGhostRenderInfo);
            placeableEntityGhostRenderInfo = null;
         }
         break;
      }
   }
}

const unuseItem = (itemType: ItemType): void => {
   switch (ITEM_TYPE_RECORD[itemType]) {
      case "healing": {
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
         const useInfo = inventoryUseComponent.limbInfos[0];
         
         useInfo.action = LimbAction.none;

         // @Bug: won't work when offhand is healing
         // Also unuse the other hand
         const itemInfo = ITEM_INFO_RECORD[itemType] as ConsumableItemInfo;
         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            const otherUseInfo = inventoryUseComponent.limbInfos[1];
            otherUseInfo.action = LimbAction.none;
         }

         // Tell the server to stop using the item
         sendStopItemUsePacket();
         break;
      }
   }
}

const onItemStartUse = (itemType: ItemType, itemInventoryName: InventoryName, itemSlot: number): void => {
   const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);

   const attackInfo = getItemAttackInfo(itemType);
   if (attackInfo.attackTimings.blockTimeTicks !== null) {
      const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);

      // Start blocking
      if (limb.action === LimbAction.none) {
         if (!itemIsResting(itemSlot)) {
            limb.action = LimbAction.engageBlock;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks;
            limb.currentActionRate = 1;
            
            sendStartItemUsePacket();
         }
         return;
      // Feign attack
      } else if (limb.action === LimbAction.windAttack || (limb.action === LimbAction.attack && limb.currentActionElapsedTicks <= AttackVars.FEIGN_SWING_TICKS_LEEWAY)) {
         // @Copynpaste
         const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const progress = secondsSinceLastAction * Settings.TPS / limb.currentActionDurationTicks;

         const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
         
         limb.action = LimbAction.feignAttack;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionElapsedTicks = AttackVars.FEIGN_TIME_TICKS;
         limb.currentActionRate = 1;
         limb.currentActionStartLimbState = copyCurrentLimbState(limb.currentActionStartLimbState, limb.currentActionEndLimbState, progress);
         limb.currentActionEndLimbState = RESTING_LIMB_STATES[limbConfiguration];
      // Buffer block
      } else {
         attackBufferTime = INPUT_COYOTE_TIME;
         bufferedInputType = BufferedInputType.block;
      }
   }

   const itemCategory = ITEM_TYPE_RECORD[itemType];
   switch (itemCategory) {
      case "healing": {
         const healthComponent = HealthComponentArray.getComponent(playerInstance!);
         const maxHealth = TRIBE_INFO_RECORD[playerTribe.tribeType].maxHealthPlayer;
         if (healthComponent.health >= maxHealth) {
            break;
         }

         const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);
         if (limb.action === LimbAction.none) {
            const itemInfo = ITEM_INFO_RECORD[itemType] as ConsumableItemInfo;
            let action: LimbAction;
            switch (itemInfo.consumableItemCategory) {
               case ConsumableItemCategory.food: {
                  action = LimbAction.eat;
                  break;
               }
               case ConsumableItemCategory.medicine: {
                  action = LimbAction.useMedicine;
                  break;
               }
            }
               
            limb.action = action;
            limb.lastEatTicks = Board.serverTicks;

            sendStartItemUsePacket();
            // @Incomplete
            // if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            //    // @Cleanup
            //    const otherUseInfo = inventoryUseComponent.limbInfos[isOffhand ? 0 : 1];
            //    otherUseInfo.action = action;
            //    otherUseInfo.lastEatTicks = Board.serverTicks;
            // }
         }

         break;
      }
      case "crossbow": {
         if (!definiteGameState.hotbarCrossbowLoadProgressRecord.hasOwnProperty(itemSlot) || definiteGameState.hotbarCrossbowLoadProgressRecord[itemSlot]! < 1) {
            // Start loading crossbow
            const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);
            limb.action = LimbAction.loadCrossbow;
            limb.lastCrossbowLoadTicks = Board.serverTicks;
            playSound("crossbow-load.mp3", 0.4, 1, transformComponent.position, null);
         } else {
            // Fire crossbow
            sendItemUsePacket();
            playSound("crossbow-fire.mp3", 0.4, 1, transformComponent.position, null);
         }
         break;
      }
      case "bow": {
         for (let i = 0; i < 2; i++) {
            const limb = getLimbByInventoryName(inventoryUseComponent, i === 0 ? InventoryName.hotbar : InventoryName.offhand);
            limb.action = LimbAction.chargeBow;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = (ITEM_INFO_RECORD[itemType] as BowItemInfo).shotChargeTimeTicks;
            limb.currentActionRate = 1;
         }
         
         sendStartItemUsePacket();
         playSound("bow-charge.mp3", 0.4, 1, transformComponent.position, null);

         break;
      }
      case "spear": {
         const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);
         if (limb.action === LimbAction.none) {
            limb.action = LimbAction.chargeSpear;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = 3 * Settings.TPS;
            limb.currentActionRate = 1;
         }
         break;
      }
      case "battleaxe": {
         // If an axe is already thrown, don't throw another
         const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);
         if (limb.thrownBattleaxeItemID !== -1) {
            break;
         }

         limb.action = LimbAction.chargeBattleaxe;
         limb.lastBattleaxeChargeTicks = Board.serverTicks;
         break;
      }
      case "glove":
      case "armour": {
         sendItemUsePacket();
         break;
      }
      case "placeable": {
         const layer = getEntityLayer(playerInstance!);
         const structureType = ITEM_INFO_RECORD[itemType as PlaceableItemType].entityType;
         const placeInfo = calculateEntityPlaceInfo(transformComponent.position, transformComponent.rotation, structureType, layer.getWorldInfo());
         
         if (placeInfo.isValid) {
            const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);
            limb.lastAttackTicks = Board.serverTicks;

            sendItemUsePacket();
         }

         break;
      }
   }
}

const onItemEndUse = (item: Item, inventoryName: InventoryName): void => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
   const limb = getLimbByInventoryName(inventoryUseComponent, inventoryName);

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "healing": {
         // Stop healing
         if (limb.action === LimbAction.eat) {
            unuseItem(item.type);
         }
         break;
      }
      case "spear": {
         if (limb.action === LimbAction.chargeSpear) {
            const chargeTime = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
            
            limb.action = LimbAction.none;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = 0;
            
            if (chargeTime >= 1) {
               sendItemUsePacket();
            } else {
               sendStopItemUsePacket();
               playSound("error.mp3", 0.4, 1, Camera.position, null);
            }
         }
         break;
      }
      case "battleaxe":
      case "bow": {
         if (itemCategory === "battleaxe") {
            if (limb.thrownBattleaxeItemID !== -1 || limb.action !== LimbAction.chargeBattleaxe) {
               break;
            }

            limb.thrownBattleaxeItemID = item.id;

            // @Hack?
            if (inventoryName === InventoryName.offhand) {
               // If an axe is already thrown, don't throw another
               Hotbar_updateLeftThrownBattleaxeItemID(item.id);
            } else {
               Hotbar_updateRightThrownBattleaxeItemID(item.id);
            }
         }

         for (let i = 0; i < 2; i++) {
            const limb = getLimbByInventoryName(inventoryUseComponent, i === 0 ? InventoryName.hotbar : InventoryName.offhand);
            limb.action = LimbAction.none;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = 0;
         }
         
         sendItemUsePacket();
         // @Incomplete: Don't play if bow didn't actually fire an arrow
         playBowFireSound(playerInstance!, item.type);

         break;
      }
      case "crossbow": {
         limb.action = LimbAction.none;
         break;
      }
   }
}

export function selectItemSlot(itemSlot: number): void {
   if (playerInstance === null || itemSlot === hotbarSelectedItemSlot) {
      return;
   }

   // Don't switch if the player is blocking
   const playerAction = getInstancePlayerAction(InventoryName.hotbar);
   if (playerAction === LimbAction.block || playerAction === LimbAction.returnBlockToRest) {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar)!;
   
   const previousItem = hotbarInventory.itemSlots[hotbarSelectedItemSlot];

   hotbarSelectedItemSlot = itemSlot;
   Hotbar_setHotbarSelectedItemSlot(itemSlot);

   // Clear any buffered inputs
   attackBufferTime = 0;

   // Deselect the previous item and select the new item
   if (typeof previousItem !== "undefined") {
      onItemDeselect(previousItem.type, false);
   }
   const newItem = hotbarInventory.itemSlots[itemSlot];
   if (typeof newItem !== "undefined") {
      onItemSelect(newItem.type);

      // @Temporary
      // I used to have the following code here:
      // if (rightMouseButtonIsPressed) {
      //    onItemStartUse(newItem.type, InventoryName.hotbar, itemSlot);
      // }
      // But I've decided that this isn't the right behaviour, as we don't want items to be
      // able to be switched while they are being used.
   }

   const playerInventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);
   const hotbarUseInfo = getLimbByInventoryName(playerInventoryUseComponent, InventoryName.hotbar);
   hotbarUseInfo.selectedItemSlot = itemSlot;

   // Update the held item type
   updatePlayerHeldItem(InventoryName.hotbar, itemSlot);

   // @Incomplete
   // @Cleanup: Copy and paste, and shouldn't be here
   // if (Player.instance !== null) {
   //    if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
   //       Player.instance.rightActiveItem = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
   //       // Player.instance.updateBowChargeTexture();
   //    } else {
   //       Player.instance.rightActiveItem = null;
   //    }
   //    if (definiteGameState.offhandInventory.itemSlots.hasOwnProperty(1)) {
   //       Player.instance.leftActiveItem = definiteGameState.offhandInventory.itemSlots[1];
   //    } else {
   //       Player.instance.leftActiveItem = null;
   //    }
   //    // Player.instance!.updateHands();
   // }
}

const tickItem = (itemType: ItemType): void => {
   const itemCategory = ITEM_TYPE_RECORD[itemType];
   switch (itemCategory) {
      case "healing": {
         // If the player can no longer eat food without wasting it, stop eating
         const healthComponent = HealthComponentArray.getComponent(playerInstance!);
         const maxHealth = TRIBE_INFO_RECORD[playerTribe.tribeType].maxHealthPlayer;
         const playerAction = getInstancePlayerAction(InventoryName.hotbar);
         if ((playerAction === LimbAction.eat || playerAction === LimbAction.useMedicine) && healthComponent.health >= maxHealth) {
            unuseItem(itemType);
         }

         break;
      }
      case "placeable": {
         // Create a ghost entity

         const layer = getCurrentLayer();
         const transformComponent = TransformComponentArray.getComponent(playerInstance!);
         
         const itemInfo = ITEM_INFO_RECORD[itemType] as PlaceableItemInfo;
         const entityType = itemInfo.entityType;
         
         const placeInfo = calculateEntityPlaceInfo(transformComponent.position, transformComponent.rotation, entityType, layer.getWorldInfo());

         const components: EntityServerComponentParams = {};

         // @Hack @Cleanup: make the client and server use the some component params system
         const componentTypes = EntityComponents[entityType];
         for (let i = 0; i < componentTypes.length; i++) {
            const componentType = componentTypes[i];

            switch (componentType) {
               case ServerComponentType.transform: {
                  const hitboxes = new Array<ClientHitbox>();
                  const tethers = new Array<HitboxTether>();
                  const staticHitboxes = new Array<ClientHitbox>();
                  for (let i = 0; i < placeInfo.hitboxes.length; i++) {
                     const hitbox = placeInfo.hitboxes[i];
                     const clientHitbox = new ClientHitbox(hitbox.box, hitbox.mass, hitbox.collisionType, hitbox.collisionBit, hitbox.collisionMask, hitbox.flags, i);
                     hitboxes.push(clientHitbox);
                     // @Hack
                     staticHitboxes.push(clientHitbox);
                  }

                  const transformComponentParams = createTransformComponentParams(
                     placeInfo.position.copy(),
                     placeInfo.rotation,
                     hitboxes,
                     tethers,
                     staticHitboxes,
                     COLLISION_BITS.default,
                     DEFAULT_COLLISION_MASK
                  );

                  components[componentType] = transformComponentParams;
                  break;
               }
               case ServerComponentType.health: {
                  const params = createHealthComponentParams(0, 0);
                  components[componentType] = params;
                  break;
               }
               case ServerComponentType.statusEffect: {
                  const params = createStatusEffectComponentParams([]);
                  components[componentType] = params;
                  break;
               }
               case ServerComponentType.structure: {
                  components[componentType] = createStructureComponentParams(false, []);
                  break;
               }
               case ServerComponentType.tribe: {
                  const playerTribeComponent = TribeComponentArray.getComponent(playerInstance!);
                  
                  components[componentType] = createTribeComponentParams(playerTribeComponent.tribeID);
                  break;
               }
               case ServerComponentType.buildingMaterial: {
                  components[componentType] = createBuildingMaterialComponentParams(BuildingMaterial.wood);
                  break;
               }
               case ServerComponentType.bracings: {
                  components[componentType] = createBracingsComponentParams();
                  break;
               }
               case ServerComponentType.inventory: {
                  components[componentType] = createInventoryComponentParams({});
                  break;
               }
               case ServerComponentType.cooking: {
                  components[componentType] = createCookingComponentParams(0, false);
                  break;
               }
               case ServerComponentType.campfire: {
                  components[componentType] = createCampfireComponentParams();
                  break;
               }
               case ServerComponentType.furnace: {
                  components[componentType] = createFurnaceComponentParams();
                  break;
               }
               case ServerComponentType.spikes: {
                  components[componentType] = createSpikesComponentParams(false);
                  break;
               }
               case ServerComponentType.fireTorch: {
                  components[componentType] = createFireTorchComponentParams();
                  break;
               }
               case ServerComponentType.slurbTorch: {
                  components[componentType] = createSlurbTorchComponentParams();
                  break;
               }
               case ServerComponentType.barrel: {
                  components[componentType] = createBarrelComponentParams();
                  break;
               }
               case ServerComponentType.researchBench: {
                  components[componentType] = createResearchBenchComponentParams(false);
                  break;
               }
               case ServerComponentType.scrappy: {
                  components[componentType] = {};
                  break;
               }
               case ServerComponentType.cogwalker: {
                  components[componentType] = {};
                  break;
               }
               case ServerComponentType.craftingStation: {
                  components[componentType] = {
                     craftingStation: 0
                  };
                  break;
               }
               case ServerComponentType.automatonAssembler: {
                  components[componentType] = {};
                  break;
               }
               case ServerComponentType.turret: {
                  components[componentType] = {
                     aimDirection: 0,
                     chargeProgress: 0,
                     reloadProgress: 0
                  };
                  break;
               }
               case ServerComponentType.aiHelper: {
                  components[componentType] = {};
                  break;
               }
               case ServerComponentType.slingTurret: {
                  components[componentType] = {};
                  break;
               }
               case ServerComponentType.ammoBox: {
                  components[componentType] = {
                     ammoType: 0,
                     ammoRemaining: 0
                  };
                  break;
               }
               case ServerComponentType.ballista: {
                  components[componentType] = {};
                  break;
               }
               case ServerComponentType.mithrilAnvil: {
                  components[componentType] = {};
                  break;
               }
               case ServerComponentType.punjiSticks: {
                  components[componentType] = {};
                  break;
               }
               case ServerComponentType.fence: {
                  components[componentType] = {};
                  break;
               }
               default: {
                  throw new Error(ServerComponentType[componentType]);
               }
            }
         }

         const preCreationInfo: EntityPreCreationInfo = {
            serverComponentTypes: componentTypes,
            serverComponentParams: components
         };

         // Create the entity
         const creationInfo = createEntity(0, entityType, layer, preCreationInfo);

         const renderInfo = creationInfo.renderInfo;

         // @Hack: Could potentially get overridden in the future
         renderInfo.tintR = placeInfo.isValid ? 0 : 0.5;
         renderInfo.tintG = placeInfo.isValid ? 0 : -0.5;
         renderInfo.tintB = placeInfo.isValid ? 0 : -0.5;

         // Modify all the render part's opacity
         for (let i = 0; i < renderInfo.allRenderThings.length; i++) {
            const renderThing = renderInfo.allRenderThings[i];
            if (thingIsVisualRenderPart(renderThing)) {
               renderThing.opacity *= 0.5;
            }
         }

         // Remove any previous render info
         if (placeableEntityGhostRenderInfo !== null) {
            removeGhostRenderInfo(placeableEntityGhostRenderInfo);
         }
         
         placeableEntityGhostRenderInfo = renderInfo;
         addGhostRenderInfo(renderInfo);

         // Manually set the render info's position and rotation
         const transformComponentParams = components[ServerComponentType.transform]!;
         renderInfo.renderPosition.x = transformComponentParams.position.x;
         renderInfo.renderPosition.y = transformComponentParams.position.y;
         renderInfo.rotation = transformComponentParams.rotation;

         break;
      }
   }
}

const GameInteractableLayer = (props: GameInteractableLayerProps) => {
   const [_, forceUpdate] = useReducer(x => x + 1, 0);
   
   const [mouseX, setMouseX] = useState(0);
   const [mouseY, setMouseY] = useState(0);
   const [hotbarChargeElapsedTicks, setHotbarChargeElapsedTicks] = useState(-1);
   const [hotbarChargeDuration, setHotbarChargeDuration] = useState(-1);
   const [offhandChargeElapsedTicks, setOffhandChargeElapsedTicks] = useState(-1);
   const [offhandChargeDuration, setOffhandChargeDuration] = useState(-1);

   const hotbarItemRestTimes = useRef(createItemRestTimes(Settings.INITIAL_PLAYER_HOTBAR_SIZE));
   const offhandItemRestTimes = useRef(createItemRestTimes(1));
   
   useEffect(() => {
      // @Hack
      GameInteractableLayer_setChargeInfo = (inventoryName: InventoryName, elapsedTicks: number, duration: number): void => {
         switch (inventoryName) {
            case InventoryName.hotbar: {
               setHotbarChargeElapsedTicks(elapsedTicks);
               setHotbarChargeDuration(duration);
               break;
            }
            case InventoryName.offhand: {
               setOffhandChargeElapsedTicks(elapsedTicks);
               setOffhandChargeDuration(duration);
               break;
            }
         }
      }

      // @Hack
      GameInteractableLayer_setItemRestTime = (inventoryName: InventoryName, itemSlot: number, restTimeTicks: number): void => {
         const itemSlotIdx = itemSlot - 1;
         switch (inventoryName) {
            case InventoryName.hotbar: {
               hotbarItemRestTimes.current[itemSlotIdx].durationTicks = restTimeTicks;
               hotbarItemRestTimes.current[itemSlotIdx].remainingTimeTicks = restTimeTicks;
               forceUpdate();
               break;
            }
            case InventoryName.offhand: {
               offhandItemRestTimes.current[itemSlotIdx].durationTicks = restTimeTicks;
               offhandItemRestTimes.current[itemSlotIdx].remainingTimeTicks = restTimeTicks;
               forceUpdate();
               break;
            }
         }
      }

      // @Hack
      GameInteractableLayer_update = () => {
         for (let i = 0; i < hotbarItemRestTimes.current.length; i++) {
            const restTime = hotbarItemRestTimes.current[i];
            if (restTime.remainingTimeTicks > 0) {
               restTime.remainingTimeTicks--;
            }
         }


         const restTime = offhandItemRestTimes.current[0];
         if (restTime.remainingTimeTicks > 0) {
            restTime.remainingTimeTicks--;
         }
         
         forceUpdate();
      }

      GameInteractableLayer_getHotbarRestTimes = () => {
         return hotbarItemRestTimes.current;
      }

      const moveListener = (e: MouseEvent) => {
         setMouseX(e.clientX)
         setMouseY(e.clientY);
      }

      document.addEventListener("mousemove", moveListener);

      return () => {
         document.removeEventListener("mousemove", moveListener);
      }
   }, []);

   const onMouseDown = (e: React.MouseEvent): void => {
      if (playerInstance === null) return;
   
      if (e.button === 0) { // Left click
         if (props.gameInteractState === GameInteractState.spectateEntity) {
            sendSpectateEntityPacket(getHoveredEntityID());
            props.setGameInteractState(GameInteractState.none);
         } else {
            attemptAttack();
         }
      } else if (e.button === 2) { // Right click
         rightMouseButtonIsPressed = true;
         
         const didSelectEntity = attemptEntitySelection();
         if (didSelectEntity) {
            e.preventDefault();
         } else {
            const selectedItemInfo = getSelectedItemInfo();
            if (selectedItemInfo !== null) {
               onItemStartUse(selectedItemInfo.item.type, selectedItemInfo.inventoryName, selectedItemInfo.itemSlot);
      
               // Special case: Barbarians can eat with both hands at once
               if (selectedItemInfo.inventoryName === InventoryName.hotbar && ITEM_TYPE_RECORD[selectedItemInfo.item.type] === "healing") {
                  const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
                  const offhandInventory = getInventory(inventoryComponent, InventoryName.offhand)!;
                  const offhandHeldItem = offhandInventory.getItem(1);
                  if (offhandHeldItem !== null) {
                     onItemStartUse(offhandHeldItem.type, InventoryName.offhand, 1);
                  }
               }
            }
         }
         
         attemptToCompleteNode();
      }
   }

   const onContextMenu = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
   }, []);

   return <>
      <div id="game-interactable-layer" draggable={false} onMouseDown={onMouseDown} onMouseUp={onGameMouseUp} onContextMenu={onContextMenu}></div>

      <HeldItemSlot heldItemSlot={props.heldItemSlot} mouseX={mouseX} mouseY={mouseY} />
      
      <AttackChargeBar mouseX={mouseX} mouseY={mouseY} chargeElapsedTicks={hotbarChargeElapsedTicks} chargeDuration={hotbarChargeDuration} />
      <AttackChargeBar mouseX={mouseX} mouseY={mouseY + 18} chargeElapsedTicks={offhandChargeElapsedTicks} chargeDuration={offhandChargeDuration} />

      {!props.cinematicModeIsEnabled ? (
         <Hotbar hotbar={props.hotbar} offhand={props.offhand} backpackSlot={props.backpackSlot} armourSlot={props.armourSlot} gloveSlot={props.gloveSlot} hotbarItemRestTimes={hotbarItemRestTimes.current} offhandItemRestTimes={offhandItemRestTimes.current} />
      ) : undefined}
   </>
}

export default GameInteractableLayer;