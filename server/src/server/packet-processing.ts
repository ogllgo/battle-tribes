import { Packet, PacketReader, PacketType } from "battletribes-shared/packets";
import PlayerClient from "./PlayerClient";
import { Entity, EntityType, LimbAction } from "battletribes-shared/entities";
import { BowItemInfo, ConsumableItemCategory, ConsumableItemInfo, getItemAttackInfo, InventoryName, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType } from "battletribes-shared/items/items";
import { TribeType } from "battletribes-shared/tribes";
import Layer from "../Layer";
import { getHeldItem, InventoryUseComponentArray, setLimbActions } from "../components/InventoryUseComponent";
import { PlayerComponentArray } from "../components/PlayerComponent";
import { changeEntityLayer, getFirstComponent, TransformComponentArray } from "../components/TransformComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { startChargingSpear, startChargingBattleaxe, createPlayerConfig, modifyBuilding } from "../entities/tribes/player";
import { placeBlueprint, throwItem, useItem } from "../entities/tribes/tribe-member";
import { beginSwing } from "../entities/tribes/limb-use";
import { InventoryComponentArray, getInventory, addItemToInventory, addItemToSlot, consumeItemFromSlot, consumeItemTypeFromInventory, craftRecipe, inventoryComponentCanAffordRecipe, recipeCraftingStationIsAvailable, addItem } from "../components/InventoryComponent";
import { BlueprintType } from "battletribes-shared/components";
import { Point } from "battletribes-shared/utils";
import { createEntity } from "../Entity";
import { generatePlayerSpawnPosition, registerDirtyEntity, registerPlayerDroppedItemPickup } from "./player-clients";
import { createItem } from "../items";
import { destroyEntity, entityExists, getEntityLayer, getEntityType, getTribe } from "../world";
import { createCowConfig } from "../entities/mobs/cow";
import { SERVER } from "./server";
import { EntityConfig } from "../components";
import { createKrumblidConfig } from "../entities/mobs/krumblid";
import { CRAFTING_RECIPES, ItemRequirements } from "../../../shared/src/items/crafting-recipes";
import { surfaceLayer, undergroundLayer } from "../layers";
import { TileType } from "../../../shared/src/tiles";
import { toggleDoor } from "../components/DoorComponent";
import { toggleFenceGateDoor } from "../components/FenceGateComponent";
import { attemptToOccupyResearchBench } from "../components/ResearchBenchComponent";
import { toggleTunnelDoor } from "../components/TunnelComponent";
import { Tech, TechID, getTechByID } from "../../../shared/src/techs";
import { CowComponentArray } from "../components/CowComponent";
import { dismountCarrySlot, mountCarrySlot, RideableComponentArray } from "../components/RideableComponent";
import { BlockAttackComponentArray } from "../components/BlockAttackComponent";
import { getTamingSkill, TamingSkillID, TamingTier } from "../../../shared/src/taming";
import { getTamingSkillLearning, skillLearningIsComplete, TamingComponentArray } from "../components/TamingComponent";
import { getTamingSpec } from "../taming-specs";
import { getHitboxTile, Hitbox, setHitboxAngularVelocity } from "../hitboxes";
import Tribe from "../Tribe";
import { createTribeWorkerConfig } from "../entities/tribes/tribe-worker";
import { FloorSignComponentArray } from "../components/FloorSignComponent";

/** How far away from the entity the attack is done */
const ATTACK_OFFSET = 50;
/** Max distance from the attack position that the attack will be registered from */
const ATTACK_RADIUS = 50;

// @Cleanup: Messy as fuck
export function processPlayerDataPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const playerComponent = PlayerComponentArray.getComponent(player);

   const positionX = reader.readNumber();
   const positionY = reader.readNumber();
   const angle = reader.readNumber();

   const velocityX = reader.readNumber();
   const velocityY = reader.readNumber();

   playerComponent.movementIntention.x = reader.readNumber();
   playerComponent.movementIntention.y = reader.readNumber();

   const angularVelocity = reader.readNumber();

   const screenWidth = reader.readNumber();
   const screenHeight = reader.readNumber();
   // const minVisibleChunkX = reader.readNumber();
   // const maxVisibleChunkX = reader.readNumber();
   // const minVisibleChunkY = reader.readNumber();
   // const maxVisibleChunkY = reader.readNumber();
   
   const selectedHotbarItemSlot = reader.readNumber();
   const mainAction = reader.readNumber() as LimbAction;
   const offhandAction = reader.readNumber() as LimbAction;

   const interactingEntityID = reader.readNumber();
   const gameDataOptions = reader.readNumber();

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
   const hotbarLimbInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);

   const transformComponent = TransformComponentArray.getComponent(player);
   const playerHitbox = transformComponent.children[0] as Hitbox;
   
   // If the player has moved or rotated, is is dirty
   if (positionX !== playerHitbox.box.position.x || positionY !== playerHitbox.box.position.y || angle !== playerHitbox.box.angle) {
      registerDirtyEntity(player);
   }
   playerHitbox.box.position.x = positionX;
   playerHitbox.box.position.y = positionY;
   playerHitbox.box.angle = angle;
   playerHitbox.box.relativeAngle = angle;

   // playerClient.visibleChunkBounds = [minVisibleChunkX, maxVisibleChunkX, minVisibleChunkY, maxVisibleChunkY];
   playerClient.screenWidth = screenWidth;
   playerClient.screenHeight = screenHeight;
   playerClient.updatePosition(playerHitbox.box.position.x, playerHitbox.box.position.y);
   playerClient.gameDataOptions = gameDataOptions;
   
   transformComponent.isDirty = true;
   
   // @Hack
   // Velocity gets overridden for carried entities, so setting here would be pointless (and would mess up stuff which relies on the velocity of carried entities)
   if (transformComponent.rootEntity === player) {
      playerHitbox.velocity.x = velocityX;
      playerHitbox.velocity.y = velocityY;
   }

   setHitboxAngularVelocity(playerHitbox, angularVelocity);
   
   if (selectedHotbarItemSlot !== hotbarLimbInfo.selectedItemSlot) {
      hotbarLimbInfo.selectedItemSlot = selectedHotbarItemSlot;
      registerDirtyEntity(player);
   }

   playerComponent.interactingEntityID = interactingEntityID;

   // @Bug: won't work for using medicine in offhand
   let overrideOffhand = false;
   
   if (mainAction === LimbAction.chargeSpear && hotbarLimbInfo.action !== LimbAction.chargeSpear) {
      startChargingSpear(playerClient.instance, InventoryName.hotbar);
   } else if (mainAction === LimbAction.chargeBattleaxe && hotbarLimbInfo.action !== LimbAction.chargeBattleaxe) {
      startChargingBattleaxe(playerClient.instance, InventoryName.hotbar);
   }

   if (!overrideOffhand) {
      const tribeComponent = TribeComponentArray.getComponent(player);
      if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
         const offhandLimbInfo = inventoryUseComponent.getLimbInfo(InventoryName.offhand);

         if (offhandAction === LimbAction.chargeSpear && offhandLimbInfo.action !== LimbAction.chargeSpear) {
            startChargingSpear(playerClient.instance, InventoryName.offhand);
         } else if (offhandAction === LimbAction.chargeBattleaxe && offhandLimbInfo.action !== LimbAction.chargeBattleaxe) {
            startChargingBattleaxe(playerClient.instance, InventoryName.offhand);
         }
      }
   }
}

// @Cleanup: most of this logic and that in attemptSwing should be done in tribe-member.ts
export function processPlayerAttackPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const itemSlot = reader.readNumber();
   // @Cleanup: unused?
   const attackDirection = reader.readNumber();
   
   // const didSwingWithRightHand = attemptSwing(player, targets, itemSlot, InventoryName.hotbar);
   const didSwingWithRightHand = beginSwing(player, itemSlot, InventoryName.hotbar);
   if (didSwingWithRightHand) {
      return;
   }

   // If a barbarian, attack with offhand
   const tribeComponent = TribeComponentArray.getComponent(player);
   if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
      // attemptSwing(player, targets, 1, InventoryName.offhand);
      beginSwing(player, 1, InventoryName.offhand);
   }
}

export function processDevGiveItemPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const itemType = reader.readNumber() as ItemType;
   const amount = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(playerClient.instance);
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
   addItemToInventory(player, inventory, itemType, amount);
}

export function processRespawnPacket(playerClient: PlayerClient): void {
   // Calculate spawn position
   let spawnPosition: Point;
   let layer: Layer;
   if (playerClient.tribe.totem !== null) {
      const totemTransformComponent = TransformComponentArray.getComponent(playerClient.tribe.totem);
      const totemHitbox = totemTransformComponent.children[0] as Hitbox;
      
      spawnPosition = totemHitbox.box.position.copy();
      const offsetDirection = 2 * Math.PI * Math.random();
      spawnPosition.x += 100 * Math.sin(offsetDirection);
      spawnPosition.y += 100 * Math.cos(offsetDirection);
      layer = getEntityLayer(playerClient.tribe.totem);
   } else {
      spawnPosition = generatePlayerSpawnPosition(playerClient.tribe.tribeType);
      layer = surfaceLayer;
   }

   const config = createPlayerConfig(spawnPosition, 0, playerClient.tribe, playerClient);
   createEntity(config, layer, 0);

   // (The PlayerComponent onJoin function will send the packet with all the information)
}

export function processStartItemUsePacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const itemSlot = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   const item = hotbarInventory.getItem(itemSlot);
   if (item === null) {
      return;
   }

   // Block with the item if possible
   const attackInfo = getItemAttackInfo(item.type);
   if (attackInfo.attackTimings.blockTimeTicks !== null) {
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
      const limbInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);

      // @Cleanup: unneeded?
      limbInfo.selectedItemSlot = itemSlot;
      
      // Begin blocking
      limbInfo.action = LimbAction.engageBlock;
      limbInfo.currentActionElapsedTicks = 0;
      limbInfo.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks;
      limbInfo.currentActionRate = 1;
      return;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
   const limb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   
   switch (ITEM_TYPE_RECORD[item.type]) {
      case "healing": {
         // Reset the food timer so that the food isn't immediately eaten
         const itemInfo = ITEM_INFO_RECORD[item.type] as ConsumableItemInfo;
         limb.foodEatingTimer = itemInfo.consumeTime;
   
         // @Incomplete
         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            setLimbActions(inventoryUseComponent, LimbAction.useMedicine);
         }
         
         limb.action = LimbAction.eat;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionRate = 1;
         break;
      }
      case "bow": {
         for (let i = 0; i < 2; i++) {
            const limb = inventoryUseComponent.getLimbInfo(i === 0 ? InventoryName.hotbar : InventoryName.offhand);
            limb.action = LimbAction.chargeBow;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = (ITEM_INFO_RECORD[item.type] as BowItemInfo).shotChargeTimeTicks;
            limb.currentActionRate = 1;
         }
         break;
      }
   }
}

export function processUseItemPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const itemSlot = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   const item = hotbarInventory.itemSlots[itemSlot];
   if (typeof item !== "undefined")  {
      useItem(playerClient.instance, item, InventoryName.hotbar, itemSlot);
   }
}

export function processStopItemUsePacket(playerClient: PlayerClient): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);

   const limb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   // If the limb isn't using an item, stop
   if (limb.action === LimbAction.none) {
      return;
   }

   // If the limb was blocking, deactivate the block box
   if (limb.action === LimbAction.block) {
      // @Copynpaste
      const heldItem = getHeldItem(limb);
      const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);

      const blockAttackComponent = BlockAttackComponentArray.getComponent(limb.blockAttack);
      const hasBlocked = blockAttackComponent.hasBlocked;
      
      limb.action = LimbAction.returnBlockToRest;
      limb.currentActionElapsedTicks = 0;
      // @Temporary? Perhaps use separate blockReturnTimeTicks.
      limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.blockTimeTicks!;
      limb.currentActionRate = hasBlocked ? 2 : 1;

      destroyEntity(limb.blockAttack);
   } else {
      limb.action = LimbAction.none;
   }

   registerDirtyEntity(player);
}

// @TEMPORARY
const dwarfTribe = new Tribe(TribeType.dwarves, true, new Point(0, 0));

export function processItemDropPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   if (playerClient.username.includes("Dragon")) {
      const playerTransformComponent = TransformComponentArray.getComponent(playerClient.instance);
      const playerHitbox = playerTransformComponent.children[0] as Hitbox;
      
      const worker = createTribeWorkerConfig(playerHitbox.box.position.copy(), 2 * Math.PI * Math.random(), dwarfTribe);
      createEntity(worker, undergroundLayer, 0);
   }

   const isOffhand = reader.readBoolean();
   reader.padOffset(3);
   const itemSlot = reader.readNumber();
   const dropAmount = reader.readNumber();
   const throwDirection = reader.readNumber();

   const inventoryName = isOffhand ? InventoryName.offhand : InventoryName.hotbar;
   throwItem(playerClient.instance, inventoryName, itemSlot, dropAmount, throwDirection);
}

export function processItemPickupPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   if (!entityExists(entity)) {
      return;
   }
   const inventoryName = reader.readNumber() as InventoryName;
   const itemSlot = reader.readNumber();
   const amount = reader.readNumber();
   
   const playerInventoryComponent = InventoryComponentArray.getComponent(player);
   const heldItemInventory = getInventory(playerInventoryComponent, InventoryName.heldItemSlot);
   
   // Don't pick up the item if there is already a held item
   if (typeof heldItemInventory.itemSlots[1] !== "undefined") {
      return;
   }

   const targetInventoryComponent = InventoryComponentArray.getComponent(entity);
   const targetInventory = getInventory(targetInventoryComponent, inventoryName);

   const pickedUpItem = targetInventory.itemSlots[itemSlot];
   if (typeof pickedUpItem === "undefined") {
      return;
   }

   // Remove the item from its previous inventory
   const amountConsumed = consumeItemFromSlot(entity, targetInventory, itemSlot, amount);

   // Hold the item
   // Copy it as the consumeItemFromSlot function modifies the original item's count
   const heldItem = createItem(pickedUpItem.type, amountConsumed);
   heldItemInventory.addItem(heldItem, 1);
}

export function processItemReleasePacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   if (!entityExists(entity)) {
      return;
   }
   const inventoryName = reader.readNumber() as InventoryName;
   const itemSlot = reader.readNumber();
   const amount = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   
   // Don't release an item if there is no held item
   const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot);
   const heldItem = heldItemInventory.itemSlots[1];
   if (typeof heldItem === "undefined") {
      return;
   }

   const targetInventoryComponent = InventoryComponentArray.getComponent(entity);

   // Add the item to the inventory
   const amountAdded = addItemToSlot(entity, targetInventoryComponent, inventoryName, itemSlot, heldItem.type, amount);

   // If all of the item was added, clear the held item
   consumeItemTypeFromInventory(entity, inventoryComponent, InventoryName.heldItemSlot, heldItem.type, amountAdded);
}

export function processEntitySummonPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const entityType = reader.readNumber() as EntityType;
   const x = reader.readNumber();
   const y = reader.readNumber();
   const rotation = reader.readNumber();

   // @Hack
   let config: EntityConfig;
   switch (entityType) {
      case EntityType.cow: {
         config = createCowConfig(new Point(x, y), rotation, 0);
         break;
      }
      case EntityType.krumblid: {
         config = createKrumblidConfig(new Point(x, y), rotation);
         break;
      }
      default: {
         console.warn("Can't summon entity!");
         return;
      }
   }
   createEntity(config, playerClient.lastLayer, 0);
}

export function processToggleSimulationPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const isSimulating = reader.readBoolean();
   reader.padOffset(3);
   SERVER.isSimulating = isSimulating;
}

// @Cleanup: name, and there is already a shared definition
const snapRotationToPlayer = (player: Entity, placePosition: Point, rotation: number): number => {
   const transformComponent = TransformComponentArray.getComponent(player);
   const playerHitbox = transformComponent.children[0] as Hitbox;
   
   const playerDirection = playerHitbox.box.position.calculateAngleBetween(placePosition);
   let snapRotation = playerDirection - rotation;

   // Snap to nearest PI/2 interval
   snapRotation = Math.round(snapRotation / Math.PI*2) * Math.PI/2;

   snapRotation += rotation;
   return snapRotation;
}

export function processPlaceBlueprintPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const structure = reader.readNumber() as Entity;
   const blueprintType = reader.readNumber() as BlueprintType;
   
   if (!entityExists(playerClient.instance) || !entityExists(structure)) {
      return;
   }

   // @Cleanup: should not do this logic here.
   const structureTransformComponent = TransformComponentArray.getComponent(structure);
   const structureHitbox = structureTransformComponent.children[0] as Hitbox;
   const rotation = snapRotationToPlayer(playerClient.instance, structureHitbox.box.position, structureHitbox.box.angle);
   placeBlueprint(playerClient.instance, structure, blueprintType, rotation);
}

export function processPlayerCraftingPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }
   
   const recipeIndex = reader.readNumber();
   if (recipeIndex < 0 || recipeIndex >= CRAFTING_RECIPES.length) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const craftingRecipe = CRAFTING_RECIPES[recipeIndex];

   // @Incomplete: Check that the player is interacting with the necessary crafting station

   if (inventoryComponentCanAffordRecipe(inventoryComponent, craftingRecipe, InventoryName.craftingOutputSlot)) {
      craftRecipe(player, inventoryComponent, craftingRecipe, InventoryName.craftingOutputSlot);
   }
}

export function processAscendPacket(playerClient: PlayerClient): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const currentLayer = getEntityLayer(player);
   if (currentLayer === undergroundLayer) {
      const transformComponent = TransformComponentArray.getComponent(player);
      const playerHitbox = transformComponent.children[0] as Hitbox;
      const tileAbove = getHitboxTile(playerHitbox);
      if (surfaceLayer.getTileType(tileAbove) === TileType.dropdown) {
         changeEntityLayer(player, surfaceLayer);
      }
   }
}

export function processTPToEntityPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const targetEntity = reader.readNumber() as Entity;

   const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   const targetHitbox = targetTransformComponent.children[0] as Hitbox;

   const packet = new Packet(PacketType.forcePositionUpdate, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.addNumber(targetHitbox.box.position.x);
   packet.addNumber(targetHitbox.box.position.y);
   playerClient.socket.send(packet.buffer);
}

export function processSpectateEntityPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   if (entityExists(entity)) {
      playerClient.cameraSubject = entity;
   }
}

export function processSetAutogiveBaseResourcesPacket(reader: PacketReader): void {
   const tribeID = reader.readNumber();
   const autogiveBaseResources = reader.readBoolean();
   reader.padOffset(3);

   const tribe = getTribe(tribeID);
   if (tribe !== null) {
      tribe.autogiveBaseResources = autogiveBaseResources;
   }
}

export function processStructureInteractPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const structure = reader.readNumber() as Entity;
   if (!entityExists(structure)) {
      return;
   }

   const interactData = reader.readNumber();

   switch (getEntityType(structure)) {
      case EntityType.door: {
         toggleDoor(structure);
         break;
      }
      case EntityType.researchBench: {
         attemptToOccupyResearchBench(structure, playerClient.instance);
         break;
      }
      case EntityType.tunnel: {
         const doorBit = interactData;
         toggleTunnelDoor(structure, doorBit);
         break;
      }
      case EntityType.fenceGate: {
         toggleFenceGateDoor(structure);
         break;
      }
   }
}

const itemIsNeededInTech = (tech: Tech, itemRequirements: ItemRequirements, itemType: ItemType): boolean => {
   // If the item isn't present in the item requirements then it isn't needed
   const amountNeeded = tech.researchItemRequirements.getItemCount(itemType);
   if (amountNeeded === 0) {
      return false;
   }
   
   const amountCommitted = itemRequirements[itemType] || 0;
   return amountCommitted < amountNeeded;
}

export function processTechUnlockPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const techID = reader.readNumber() as TechID;

   const tech = getTechByID(techID);
   
   const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
   const inventoryComponent = InventoryComponentArray.getComponent(playerClient.instance);

   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   
   // Consume any available items
   for (let i = 0; i < hotbarInventory.items.length; i++) {
      const item = hotbarInventory.items[i];

      const itemProgress = tribeComponent.tribe.techTreeUnlockProgress[techID]?.itemProgress || {};
      if (itemIsNeededInTech(tech, itemProgress, item.type)) {
         const amountNeeded = tech.researchItemRequirements.getItemCount(item.type);
         const amountCommitted = itemProgress[item.type] || 0;

         const amountToAdd = Math.min(item.count, amountNeeded - amountCommitted);

         item.count -= amountToAdd;
         if (item.count === 0) {
            const itemSlot = hotbarInventory.getItemSlot(item);
            hotbarInventory.removeItem(itemSlot);
         }

         const unlockProgress = tribeComponent.tribe.techTreeUnlockProgress[techID];
         if (typeof unlockProgress !== "undefined") {
            unlockProgress.itemProgress[item.type] = amountCommitted + amountToAdd;
         } else {
            tribeComponent.tribe.techTreeUnlockProgress[techID] = {
               itemProgress: {
                  [item.type]: amountCommitted + amountToAdd
               },
               studyProgress: 0
            };
         }
      }
   }

   if (tribeComponent.tribe.techIsComplete(tech)) {
      tribeComponent.tribe.unlockTech(tech);
   }
}

export function processSelectTechPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const techID = reader.readNumber() as TechID;

   playerClient.tribe.selectedTechID = techID;
}

export function processTechStudyPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const studyAmount = reader.readNumber();

   const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
   
   if (tribeComponent.tribe.selectedTechID !== null) {
      const transformComponent = TransformComponentArray.getComponent(playerClient.instance);
      const playerHitbox = transformComponent.children[0] as Hitbox;

      const selectedTech = getTechByID(tribeComponent.tribe.selectedTechID);
      playerClient.tribe.studyTech(selectedTech, playerHitbox.box.position.x, playerHitbox.box.position.y, studyAmount);
   }
}

export function processAnimalStaffFollowCommandPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   if (!entityExists(entity)) {
      return;
   }

   const tamingComponent = getFirstComponent(TamingComponentArray, entity);
   // Toggle the follow target
   if (!entityExists(tamingComponent.followTarget)) {
      tamingComponent.followTarget = playerClient.instance;
   } else {
      tamingComponent.followTarget = 0;
   }
}

export function processMountCarrySlotPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const mount = reader.readNumber() as Entity;
   if (!entityExists(mount)) {
      return;
   }

   const rideableComponent = RideableComponentArray.getComponent(mount);
   const carrySlot = rideableComponent.carrySlots[0];

   mountCarrySlot(player, mount, carrySlot);
}

export function processDismountCarrySlotPacket(playerClient: PlayerClient): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(player);
   if (entityExists(transformComponent.parentEntity)) {
      dismountCarrySlot(player, transformComponent.parentEntity);
   }
}

export function processPickUpArrowPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const arrow = reader.readNumber() as Entity;

   const transformComponent = TransformComponentArray.getComponent(arrow);
   const hitbox = transformComponent.children[0] as Hitbox;
   if (hitbox.velocity.length() < 1) {
      destroyEntity(arrow);
      
      const inventoryComponent = InventoryComponentArray.getComponent(player);
      addItem(player, inventoryComponent, ItemType.woodenArrow, 1);
      // @Hack: should be detected in addItem or something. shuldn't have to be manually done at the place of calling, yknow?
      registerPlayerDroppedItemPickup(player);
   }
}

export function processModifyBuildingPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const structure = reader.readNumber() as Entity;
   const data = reader.readNumber();
   
   modifyBuilding(playerClient.instance, structure, data);
}

export function processSetMoveTargetPositionPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   const targetX = reader.readNumber();
   const targetY = reader.readNumber();
   
   const cowComponent = CowComponentArray.getComponent(entity);
   cowComponent.targetMovePosition = new Point(targetX, targetY);
}

export function processSetCarryTargetPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   const carryTarget = reader.readNumber();
   
   const tamingComponent = getFirstComponent(TamingComponentArray, entity);
   tamingComponent.carryTarget = carryTarget;
}

export function processSetAttackTargetPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   const attackTarget = reader.readNumber();
   
   const cowComponent = CowComponentArray.getComponent(entity);
   cowComponent.attackTarget = attackTarget;
}

export function processCompleteTamingTierPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   const tamingComponent = getFirstComponent(TamingComponentArray, entity);

   // @Hack
   const foodRequired: number | undefined = getTamingSpec(entity).tierFoodRequirements[(tamingComponent.tamingTier + 1) as TamingTier];
   if (typeof foodRequired !== "undefined" && tamingComponent.foodEatenInTier >= foodRequired) {
      // @Cleanup @Copynpaste
      tamingComponent.tamingTier++;
      tamingComponent.foodEatenInTier = 0;
      tamingComponent.tameTribe = playerClient.tribe;
   }
}

export function processForceCompleteTamingTierPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   const tamingComponent = getFirstComponent(TamingComponentArray, entity);
   // @Cleanup @Copynpaste
   tamingComponent.tamingTier++;
   tamingComponent.foodEatenInTier = 0;
   tamingComponent.tameTribe = playerClient.tribe;
}

export function processAcquireTamingSkillPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   const skillID = reader.readNumber() as TamingSkillID;
   
   const tamingComponent = getFirstComponent(TamingComponentArray, entity);
   const skillLearning = getTamingSkillLearning(tamingComponent, skillID);
   if (skillLearning !== null && skillLearningIsComplete(skillLearning)) {
      const skill = getTamingSkill(skillID);
      tamingComponent.acquiredSkills.push(skill);
   }
}

export function processForceAcquireTamingSkillPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   const skillID = reader.readNumber() as TamingSkillID;
   
   const skill = getTamingSkill(skillID);
   
   const tamingComponent = getFirstComponent(TamingComponentArray, entity);
   tamingComponent.acquiredSkills.push(skill);
}

export function processSetSpectatingPositionPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const x = reader.readNumber() as Entity;
   const y = reader.readNumber() as TamingSkillID;
   playerClient.updatePosition(x, y);
}

export function processDevSetViewedSpawnDistribution(playerClient: PlayerClient, reader: PacketReader): void {
   const entityType = reader.readNumber();
   playerClient.viewedSpawnDistribution = entityType;
}

export function processSetSignMessagePacket(reader: PacketReader): void {
   const entity = reader.readNumber();
   const message = reader.readString();

   const floorSignComponent = FloorSignComponentArray.getComponent(entity);
   floorSignComponent.message = message;
}