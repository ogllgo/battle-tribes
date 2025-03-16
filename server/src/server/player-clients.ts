import { HitData, PlayerKnockbackData, HealData, ResearchOrbCompleteData } from "battletribes-shared/client-server-types";
import { BuildingMaterial, MATERIAL_TO_ITEM_MAP } from "battletribes-shared/components";
import { TechID } from "battletribes-shared/techs";
import { TribesmanTitle } from "battletribes-shared/titles";
import Layer from "../Layer";
import { registerCommand } from "../commands";
import PlayerClient from "./PlayerClient";
import { SERVER } from "./server";
import { createInitialGameDataPacket } from "./packet-creation";
import { Entity, EntityType } from "battletribes-shared/entities";
import { TRIBE_INFO_RECORD, TribeType } from "battletribes-shared/tribes";
import { InventoryComponentArray, addItemToInventory, getInventory } from "../components/InventoryComponent";
import { TribeComponentArray, recruitTribesman } from "../components/TribeComponent";
import { getTileX, getTileY, Point, randInt, randItem } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { getTilesOfBiome } from "../census";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { deoccupyResearchBench } from "../components/ResearchBenchComponent";
import { BuildingMaterialComponentArray } from "../components/BuildingMaterialComponent";
import { TurretComponentArray } from "../components/TurretComponent";
import { TribesmanAIComponentArray } from "../components/TribesmanAIComponent";
import { EntitySummonPacket } from "battletribes-shared/dev-packets";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import Tribe from "../Tribe";
import { EntityTickEvent } from "battletribes-shared/entity-events";
import { TransformComponentArray } from "../components/TransformComponent";
import { destroyEntity, entityExists, getEntityType, getTribe } from "../world";
import { surfaceLayer } from "../layers";
import { createItemsOverEntity } from "../entities/item-entity";
import { acceptTitleOffer, rejectTitleOffer, forceAddTitle, removeTitle } from "../components/TribesmanComponent";
import { Hitbox } from "../hitboxes";

// @Cleanup: see if a decorator can be used to cut down on the player entity check copy-n-paste

/** Minimum number of units away from the border that the player will spawn at */
const PLAYER_SPAWN_POSITION_PADDING = 300;

const playerClients = new Array<PlayerClient>();

const dirtyEntities = new Set<Entity>();

export function getPlayerClients(): ReadonlyArray<PlayerClient> {
   return playerClients;
}

const getPlayerClientFromInstanceID = (instanceID: number): PlayerClient | null => {
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];

      if (playerClient.instance === instanceID) {
         return playerClient;
      }
   }

   return null;
}

// @Cleanup: better to be done by the player component array
export function getPlayerFromUsername(username: string): Entity | null {
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];

      if (playerClient.username === username && entityExists(playerClient.instance)) {
         return playerClient.instance;
      }
   }

   return null;
}

export function handlePlayerDisconnect(playerClient: PlayerClient): void {
   // Remove player client
   const idx = playerClients.indexOf(playerClient);
   if (idx !== -1) {
      playerClients.splice(idx, 1);
   } else {
      console.warn("Could not find the player client.");
   }

   // Kill the player
   if (entityExists(playerClient.instance)) {
      destroyEntity(playerClient.instance);
   }
}

export function generatePlayerSpawnPosition(tribeType: TribeType): Point {
   // @Temporary
   return new Point(Settings.BOARD_UNITS * 0.5, Settings.BOARD_UNITS * 0.5);
   
   const tribeInfo = TRIBE_INFO_RECORD[tribeType];
   for (let numAttempts = 0; numAttempts < 50; numAttempts++) {
      const biomeName = randItem(tribeInfo.biomes);
      const biomeTiles = getTilesOfBiome(surfaceLayer, biomeName);
      if (biomeTiles.length === 0) {
         continue;
      }

      const tileIndex = randItem(biomeTiles);

      const tileX = getTileX(tileIndex);
      const tileY = getTileY(tileIndex);
      const x = (tileX + Math.random()) * Settings.TILE_SIZE;
      const y = (tileY + Math.random()) * Settings.TILE_SIZE;

      if (x < PLAYER_SPAWN_POSITION_PADDING || x >= Settings.BOARD_UNITS - PLAYER_SPAWN_POSITION_PADDING || y < PLAYER_SPAWN_POSITION_PADDING || y >= Settings.BOARD_UNITS - PLAYER_SPAWN_POSITION_PADDING) {
         continue;
      }

      return new Point(x, y);
   }
   
   // If all else fails, just pick a random position
   const x = randInt(PLAYER_SPAWN_POSITION_PADDING, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - PLAYER_SPAWN_POSITION_PADDING);
   const y = randInt(PLAYER_SPAWN_POSITION_PADDING, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - PLAYER_SPAWN_POSITION_PADDING);
   return new Point(x, y);
}

const processCommandPacket = (playerClient: PlayerClient, command: string): void => {
   if (!entityExists(playerClient.instance)) {
      return;
   }
   
   registerCommand(command, playerClient.instance);
}

const processTechForceUnlock = (playerClient: PlayerClient, techID: TechID): void => {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   // @Incomplete
   // playerClient.tribe.forceUnlockTech(techID);
}

const processDeconstructPacket = (playerClient: PlayerClient, structure: Entity): void => {
   if (!entityExists(structure)) {
      return;
   }

   // Deconstruct
   destroyEntity(structure);

   if (BuildingMaterialComponentArray.hasComponent(structure)) {
      const materialComponent = BuildingMaterialComponentArray.getComponent(structure);
      
      if (getEntityType(structure) === EntityType.wall && materialComponent.material === BuildingMaterial.wood) {
         createItemsOverEntity(structure, ItemType.wooden_wall, 1);
         return;
      }
      
      const materialItemType = MATERIAL_TO_ITEM_MAP[materialComponent.material];
      createItemsOverEntity(structure, materialItemType, 5);
   }
}

const processStructureUninteractPacket = (playerClient: PlayerClient, structure: Entity): void => {
   if (!entityExists(playerClient.instance) || !entityExists(playerClient.instance)) {
      return;
   }

   switch (getEntityType(structure)) {
      case EntityType.researchBench: {
         deoccupyResearchBench(structure, playerClient.instance);
         break;
      }
   }
}

const processRecruitTribesmanPacket = (playerClient: PlayerClient, tribesman: Entity): void => {
   if (!entityExists(playerClient.instance) || !entityExists(tribesman)) {
      return;
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   const relation = tribesmanComponent.tribesmanRelations[playerClient.instance];
   if (typeof relation !== "undefined" && relation >= 50) {
      const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
      
      recruitTribesman(tribesman, tribeComponent.tribe);
   }
}
const processRespondToTitleOfferPacket = (playerClient: PlayerClient, title: TribesmanTitle, isAccepted: boolean): void => {
   if (!entityExists(playerClient.instance)) {
      return;
   }
   
   if (isAccepted) {
      acceptTitleOffer(playerClient.instance, title);
   } else {
      rejectTitleOffer(playerClient.instance, title);
   }
}

const devGiveItem = (playerClient: PlayerClient, itemType: ItemType, amount: number): void => {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
   addItemToInventory(player, inventory, itemType, amount);
}

const devSummonEntity = (playerClient: PlayerClient, summonPacket: EntitySummonPacket): void => {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   // @Incomplete

   // const config = createEntityConfig(summonPacket.entityType);
   // config.components[ServerComponentType.transform].position.x = summonPacket.position[0];
   // config.components[ServerComponentType.transform].position.y = summonPacket.position[1];
   // config.components[ServerComponentType.transform].rotation = summonPacket.rotation;

   // const inventoryComponentSummonData = summonPacket.summonData[ServerComponentType.inventory];
   // if (typeof inventoryComponentSummonData !== "undefined") {
   //    config.components[ServerComponentType.inventory].inventories
      
   //    const inventoryNames = Object.keys(inventoryComponentSummonData.itemSlots).map(Number) as Array<InventoryName>;
   //    for (let i = 0; i < inventoryNames.length; i++) {
   //       const inventoryName = inventoryNames[i];

   //       let inventory!: Inventory;
   //       const inventories = config.components[ServerComponentType.inventory].inventories;
   //       for (let i = 0; i < inventories.length; i++) {
   //          const currentInventory = inventories[i];
   //          if (currentInventory.name === inventoryName) {
   //             inventory =  currentInventory;
   //          }
   //       }
         
   //       const itemSlots = inventoryComponentSummonData.itemSlots[inventoryName]!;
   //       for (const [itemSlotString, itemData] of Object.entries(itemSlots) as Array<[string, Item]>) {
   //          const itemSlot = Number(itemSlotString);
            
   //          const item = createItem(itemData.type, itemData.count);
   //          inventory.addItem(item, itemSlot);
   //       }
   //    }
   // }

   // const tribeComponentSummonData = summonPacket.summonData[ServerComponentType.tribe];
   // if (typeof tribeComponentSummonData !== "undefined") {
   //    config.components[ServerComponentType.tribe].tribe = getTribe(tribeComponentSummonData.tribeID);
   // }

   // createEntityFromConfig(config, getEntityLayer(playerClient.instance), 0);
}

const devGiveTitle = (playerClient: PlayerClient, title: TribesmanTitle): void => {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   forceAddTitle(player, title);
}

const devRemoveTitle = (playerClient: PlayerClient, title: TribesmanTitle): void => {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   removeTitle(player, title);
}

export function addPlayerClient(playerClient: PlayerClient, layer: Layer, spawnPosition: Point): void {
   playerClients.push(playerClient);

   const socket = playerClient.socket;

   const initialGameDataPacket = createInitialGameDataPacket(layer, spawnPosition);
   socket.send(initialGameDataPacket);

   socket.on("deactivate", () => {
      playerClient.clientIsActive = false;
   });

   socket.on("command", (command: string) => {
      processCommandPacket(playerClient, command);
   });

   socket.on("force_unlock_tech", (techID: TechID): void => {
      processTechForceUnlock(playerClient, techID);
   });

   socket.on("deconstruct_building", (structureID: number): void => {
      processDeconstructPacket(playerClient, structureID);
   });

   socket.on("structure_uninteract", (structureID: number): void => {
      processStructureUninteractPacket(playerClient, structureID);
   });

   socket.on("recruit_tribesman", (tribesmanID: number): void => {
      processRecruitTribesmanPacket(playerClient, tribesmanID);
   });

   socket.on("respond_to_title_offer", (title: TribesmanTitle, isAccepted: boolean): void => {
      processRespondToTitleOfferPacket(playerClient, title, isAccepted);
   });

   socket.on("dev_pause_simulation", (): void => {
      SERVER.isSimulating = false;
   });

   socket.on("dev_unpause_simulation", (): void => {
      SERVER.isSimulating = true;
   });

   // -------------------------- //
   //       DEV-ONLY EVENTS      //
   // -------------------------- //

   socket.on("dev_give_item", (itemType: ItemType, amount: number): void => {
      devGiveItem(playerClient, itemType, amount);
   });

   socket.on("dev_summon_entity", (summonPacket: EntitySummonPacket): void => {
      devSummonEntity(playerClient, summonPacket);
   });

   socket.on("dev_give_title", (title: TribesmanTitle): void => {
      devGiveTitle(playerClient, title);
   });

   socket.on("dev_remove_title", (title: TribesmanTitle): void => {
      devRemoveTitle(playerClient, title);
   });

   socket.on("dev_create_tribe", (): void => {
      new Tribe(TribeType.plainspeople, true, new Point(Settings.BOARD_UNITS * 0.5, Settings.BOARD_UNITS * 0.5));
   });

   socket.on("dev_change_tribe_type", (tribeID: number, newTribeType: TribeType): void => {
      const tribe = getTribe(tribeID);
      if (tribe !== null) {
         tribe.tribeType = newTribeType;
      }
   });
}




const shouldShowDamageNumber = (playerClient: PlayerClient, attackingEntity: Entity | null): boolean => {
   if (attackingEntity === null) {
      return false;
   }
   
   // Show damage from the player
   if (attackingEntity === playerClient.instance) {
      return true;
   }

   // Show damage from friendly turrets
   if (TurretComponentArray.hasComponent(attackingEntity)) {
      const tribeComponent = TribeComponentArray.getComponent(attackingEntity);
      if (tribeComponent.tribe === playerClient.tribe) {
         return true;
      }
   }

   return false;
}

const getPlayersViewingEntity = (entity: Entity): ReadonlyArray<PlayerClient> => {
   const viewingPlayerClients = new Array<PlayerClient>();
   // @Speed: will probs become a major source of slowness with 50+ players
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];
      if (playerClient.clientIsActive && playerClient.visibleEntities.has(entity)) {
         viewingPlayerClients.push(playerClient);
      }
   }
   return viewingPlayerClients;
}

const getPlayersViewingPosition = (minX: number, maxX: number, minY: number, maxY: number): ReadonlyArray<PlayerClient> => {
   const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   const viewingPlayerClients = new Array<PlayerClient>();
   // @Speed: will probs become a major source of slowness with 50+ players
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];
      if (!playerClient.clientIsActive) {
         continue;
      }
      if (minChunkX <= playerClient.maxVisibleChunkX && maxChunkX >= playerClient.minVisibleChunkX && minChunkY <= playerClient.maxVisibleChunkY && maxChunkY >= playerClient.minVisibleChunkY) {
         viewingPlayerClients.push(playerClient);
      }
   }
   return viewingPlayerClients;
}

export function registerEntityHit(hitEntity: Entity, attackingEntity: Entity | null, hitPosition: Point, attackEffectiveness: AttackEffectiveness, damage: number, flags: number): void {
   const viewingPlayers = getPlayersViewingEntity(hitEntity);
   if (viewingPlayers.length === 0) {
      return;
   }
   
   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];

      const hitData: HitData = {
         hitEntityID: hitEntity,
         hitPosition: hitPosition.package(),
         attackEffectiveness: attackEffectiveness,
         damage: damage,
         shouldShowDamageNumber: shouldShowDamageNumber(playerClient, attackingEntity),
         flags: flags
      };
      playerClient.visibleHits.push(hitData);
   }
}

export function registerPlayerKnockback(playerID: number, knockback: number, knockbackDirection: number): void {
   const knockbackData: PlayerKnockbackData = {
      knockback: knockback,
      knockbackDirection: knockbackDirection
   };

   const playerClient = getPlayerClientFromInstanceID(playerID);
   if (playerClient !== null) {
      playerClient.playerKnockbacks.push(knockbackData);
   }
}

export function registerEntityHeal(healedEntity: Entity, healer: Entity, healAmount: number): void {
   const viewingPlayers = getPlayersViewingEntity(healedEntity);
   if (viewingPlayers.length === 0) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(healedEntity);
   // @Hack
   const healedEntityHitbox = transformComponent.children[0] as Hitbox;
   
   const healData: HealData = {
      entityPositionX: healedEntityHitbox.box.position.x,
      entityPositionY: healedEntityHitbox.box.position.y,
      healedID: healedEntity,
      healerID: healer,
      healAmount: healAmount
   };
   
   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.heals.push(healData);
   }
}

export function registerEntityRemoval(entity: Entity): void {
   const viewingPlayers = getPlayersViewingEntity(entity);
   if (viewingPlayers.length === 0) {
      return;
   }

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.visibleEntityDeathIDs.push(entity);
   }
}

export function registerResearchOrbComplete(orbCompleteData: ResearchOrbCompleteData): void {
   const viewingPlayers = getPlayersViewingPosition(orbCompleteData.x, orbCompleteData.x, orbCompleteData.y, orbCompleteData.y);
   if (viewingPlayers.length === 0) {
      return;
   }

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.orbCompletes.push(orbCompleteData);
   }
}

export function registerEntityTickEvent(entity: Entity, tickEvent: EntityTickEvent): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const viewingPlayers = getPlayersViewingPosition(transformComponent.boundingAreaMinX, transformComponent.boundingAreaMaxX, transformComponent.boundingAreaMinY, transformComponent.boundingAreaMaxY);
   if (viewingPlayers.length === 0) {
      return;
   }

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.entityTickEvents.push(tickEvent);
   }
}

export function registerPlayerDroppedItemPickup(player: Entity): void {
   const playerClient = getPlayerClientFromInstanceID(player);
   if (playerClient !== null) {
      playerClient.hasPickedUpItem = true;
   } else {
      console.warn("Couldn't find player to pickup item!");
   }
}

export function registerDirtyEntity(entity: Entity): void {
   if (dirtyEntities.has(entity)) {
      return;
   }
   dirtyEntities.add(entity);
   
   const viewingPlayers = getPlayersViewingEntity(entity);

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.visibleDirtiedEntities.push(entity);
   }
}

export function resetDirtyEntities(): void {
   dirtyEntities.clear();
}