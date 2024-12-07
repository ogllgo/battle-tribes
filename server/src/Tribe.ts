import { PotentialBuildingPlanData } from "battletribes-shared/ai-building-types";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StructureType } from "battletribes-shared/structures";
import { TechID, TechTreeUnlockProgress, TechInfo, getTechByID, TECHS } from "battletribes-shared/techs";
import { TribeType, TRIBE_INFO_RECORD } from "battletribes-shared/tribes";
import { Point, randItem, clampToBoardDimensions, TileIndex } from "battletribes-shared/utils";
import Chunk from "./Chunk";
import { TotemBannerComponentArray, addBannerToTotem, removeBannerFromTotem } from "./components/TotemBannerComponent";
import { InventoryComponentArray, getInventory } from "./components/InventoryComponent";
import { getPathfindingGroupID } from "./pathfinding";
import { getPlayerClients, registerResearchOrbComplete } from "./server/player-clients";
import { HutComponentArray } from "./components/HutComponent";
import { ItemType, InventoryName } from "battletribes-shared/items/items";
import { TransformComponentArray } from "./components/TransformComponent";
import { createEntity } from "./Entity";
import { addTribe, destroyEntity, entityExists, getEntityLayer, getEntityType, getGameTicks, removeTribe } from "./world";
import Layer, { getTileIndexIncludingEdges } from "./Layer";
import { EntityConfig } from "./components";
import { createTribeWorkerConfig } from "./entities/tribes/tribe-worker";
import { createTribeWarriorConfig } from "./entities/tribes/tribe-warrior";
import { layers, surfaceLayer, undergroundLayer } from "./layers";
import TribeBuildingLayer, { createVirtualBuilding, createVirtualBuildingsByEntityType, VirtualBuilding, VirtualWall } from "./tribesman-ai/building-plans/TribeBuildingLayer";
import { createRootPlan, TribesmanPlan } from "./tribesman-ai/tribesman-ai-planning";

const ENEMY_ATTACK_REMEMBER_TIME_TICKS = 30 * Settings.TPS;
const RESPAWN_TIME_TICKS = 5 * Settings.TPS;

let tribeIDCounter = 0;

const TRIBE_BUILDING_AREA_INFLUENCES = {
   [EntityType.tribeTotem]: 200,
   [EntityType.workerHut]: 150,
   [EntityType.warriorHut]: 150
} satisfies Partial<Record<EntityType, number>>;

interface TileInfluence {
   readonly tile: TileIndex;
   /** The number of buildings contributing to the tile */
   numInfluences: number;
}

interface ChunkInfluence {
   readonly chunk: Chunk;
   numInfluences: number;
}

const getTribeHomeLayer = (tribeType: TribeType): Layer => {
   switch (tribeType) {
      case TribeType.plainspeople:
      case TribeType.barbarians:
      case TribeType.frostlings:
      case TribeType.goblins: {
         return surfaceLayer;
      }
      case TribeType.dwarves: {
         return undergroundLayer;
      }
   }
}

const NOUNS: ReadonlyArray<string> = [
   "Warmongers",
   "Savages",
   "Adventurers",
   "Guardians",
   "Defenders",
   "Warriors"
];
const ADJECTIVES: ReadonlyArray<string> = [
   "Rabid",
   "Brutal"
];
const ORIGINS: Record<TribeType, string> = {
   [TribeType.barbarians]: "Desert",
   [TribeType.frostlings]: "Tundra",
   [TribeType.goblins]: "Mountains",
   [TribeType.plainspeople]: "Plains",
   [TribeType.dwarves]: "Caves"
};

const generateTribeName = (tribeType: TribeType): string => {
   if (Math.random() < 0.5) {
      // Adjective + Noun + (maybe) origin

      const noun = randItem(NOUNS);
      const adjective = randItem(ADJECTIVES);

      let name = adjective + " " + noun;

      if (Math.random() < 0.5) {
         const origin = ORIGINS[tribeType];
         name += " of the " + origin;
      }

      return name;
   } else {
      // Noun + origin

      const noun = randItem(NOUNS);
      const origin = ORIGINS[tribeType];

      return noun + " of the " + origin;
   }
}

class Tribe {
   public readonly name: string;
   public readonly id = tribeIDCounter++;
   
   public tribeType: TribeType;
   public readonly isAIControlled: boolean;
   /** The layer which the tribe will create their base in. */
   public readonly homeLayer: Layer;

   public isRemoveable = false;

   public totem: Entity | null = null;
   
   // /** Stores all tribe huts belonging to the tribe */
   private readonly huts = new Array<Entity>();

   public barrels = new Array<Entity>();

   public readonly researchBenches = new Array<Entity>();

   public readonly buildings = new Array<Entity>();
   public buildingsAreDirty = true;

   public rootPlan = createRootPlan();

   /** Stores all tiles in the tribe's zone of influence */
   private area: Record<number, TileInfluence> = {};
   private chunkArea: Record<number, ChunkInfluence> = {};

   public tribesmanCap: number;

   public selectedTechID: TechID | null = null;
   public readonly unlockedTechs = new Array<TechID>();
   public readonly techTreeUnlockProgress: TechTreeUnlockProgress = {};

   private readonly respawnTimesRemaining = new Array<number>();
   private readonly respawnHutIDs = new Array<number>();

   public tribesmanIDs = new Array<number>();

   /** Stores building info for each layer, accessed through the layer's depth */
   public readonly buildingLayers = layers.map(layer => new TribeBuildingLayer(layer, this));

   public potentialPlansData: ReadonlyArray<PotentialBuildingPlanData> = [];

   public availableResources: Partial<Record<ItemType, number>> = {};

   public attackingEntities: Partial<Record<number, number>> = {};

   public virtualEntityIDCounter = 0;

   // Whereas each building layer stores these only for that building layer, this stores all virtual buildings in every building layer
   public virtualBuildings = new Array<VirtualBuilding>;
   public virtualBuildingRecord: Record<number, VirtualBuilding> = {};
   public virtualBuildingsByEntityType = createVirtualBuildingsByEntityType();

   public readonly pathfindingGroupID: number;
   
   constructor(tribeType: TribeType, isAIControlled: boolean) {
      this.name = generateTribeName(tribeType);
      this.tribeType = tribeType;
      this.isAIControlled = isAIControlled;
      this.homeLayer = getTribeHomeLayer(tribeType);

      this.tribesmanCap = TRIBE_INFO_RECORD[tribeType].baseTribesmanCap;
      this.pathfindingGroupID = getPathfindingGroupID();

      addTribe(this);
   }

   public addBuilding(building: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(building);
      
      const entityType = getEntityType(building) as StructureType;
      const layer = getEntityLayer(building);
      
      const buildingLayer = this.buildingLayers[layer.depth];
      const virtualBuilding = createVirtualBuilding(buildingLayer, transformComponent.position.copy(), transformComponent.rotation, entityType, )
      buildingLayer.addVirtualBuilding(virtualBuilding);

      this.buildings.push(building);

      this.buildingsAreDirty = true;
      this.isRemoveable = true;

      switch (entityType) {
         case EntityType.tribeTotem: {
            if (this.totem !== null) {
               console.warn("Tribe already has a totem.");
               return;
            }

            this.totem = building;

            this.createTribeAreaAroundBuilding(getEntityLayer(building), transformComponent.position, TRIBE_BUILDING_AREA_INFLUENCES[EntityType.tribeTotem]);
            break;
         }
         case EntityType.researchBench: {
            this.researchBenches.push(building);
            break;
         }
         case EntityType.workerHut:
         case EntityType.warriorHut: {
            if (this.totem === null) {
               console.warn("Can't register a hut without a totem!");
               return;
            }

            this.huts.push(building);

            this.createTribeAreaAroundBuilding(getEntityLayer(building), transformComponent.position, TRIBE_BUILDING_AREA_INFLUENCES[entityType]);
            
            const bannerComponent = TotemBannerComponentArray.getComponent(this.totem);
            addBannerToTotem(bannerComponent, this.huts.length - 1);

            break;
         }
         case EntityType.barrel: {
            this.barrels.push(building);
            break;
         }
      }
   }

   public removeBuilding(building: Entity): void {
      this.buildings.splice(this.buildings.indexOf(building), 1);

      const layer = getEntityLayer(building);
      const buildingLayer = this.buildingLayers[layer.depth];
      const virtualBuilding = buildingLayer.virtualBuildingRecord[building];
      buildingLayer.removeVirtualBuilding(virtualBuilding);
      
      this.buildingsAreDirty = true;

      switch (getEntityType(building)) {
         case EntityType.tribeTotem: {
            this.totem = null;
            break;
         }
         case EntityType.researchBench: {
            const idx = this.researchBenches.indexOf(building);
            if (idx !== -1) {
               this.researchBenches.splice(idx, 1);
            }
            break;
         }
         case EntityType.workerHut: {
            const idx = this.huts.indexOf(building);
            if (idx !== -1) {
               this.huts.splice(idx, 1);
            }

            if (this.totem !== null) {
               const bannerComponent = TotemBannerComponentArray.getComponent(this.totem);
               removeBannerFromTotem(bannerComponent, idx);
            }

            const transformComponent = TransformComponentArray.getComponent(building);
            this.removeBuildingFromTiles(transformComponent.position, TRIBE_BUILDING_AREA_INFLUENCES[EntityType.workerHut]);
            break;
         }
         case EntityType.warriorHut: {
            const idx = this.huts.indexOf(building);
            if (idx !== -1) {
               this.huts.splice(idx, 1);
            }

            if (this.totem !== null) {
               const bannerComponent = TotemBannerComponentArray.getComponent(this.totem);
               removeBannerFromTotem(bannerComponent, idx);
            }

            const transformComponent = TransformComponentArray.getComponent(building);
            this.removeBuildingFromTiles(transformComponent.position, TRIBE_BUILDING_AREA_INFLUENCES[EntityType.warriorHut]);
            break;
         }
         case EntityType.barrel: {
            const idx = this.barrels.indexOf(building);
            if (idx !== -1) {
               this.barrels.splice(idx, 1);
            }
            break;
         }
      }
   }

   public addAttackingEntity(attackingEntityID: number): void {
      this.attackingEntities[attackingEntityID] = ENEMY_ATTACK_REMEMBER_TIME_TICKS;
   }

   public unlockTech(techID: TechID): void {
      if (!this.unlockedTechs.includes(techID)) {
         this.unlockedTechs.push(techID);
         this.selectedTechID = null;
      }
   }

   public tick(): void {
      // @Incomplete: automatically detect if there are no entities left which have a tribe component with this tribe
      // Destroy tribe if it has no entities left
      if (this.isRemoveable && this.totem === null && this.tribesmanIDs.length === 0 && this.buildings.length === 0) {
         // @Speed
         // Make sure there are no players which can still respawn as this tribe
         let hasPlayers = false;
         for (const playerClient of getPlayerClients()) {
            if (playerClient.tribe === this) {
               hasPlayers = true;
               break;
            }
         }
         
         if (!hasPlayers) {
            this.destroy();
            return;
         }
      }

      const attackingEntityIDs = Object.keys(this.attackingEntities).map(idString => Number(idString));
      for (let i = 0; i < attackingEntityIDs.length; i++) {
         const id = attackingEntityIDs[i];
         this.attackingEntities[id]!--;
         if (this.attackingEntities[id] === 0) {
            delete this.attackingEntities[id];
         }
      }

      for (let i = 0; i < this.respawnTimesRemaining.length; i++) {
         if (--this.respawnTimesRemaining[i] <= 0) {
            const hut = this.respawnHutIDs[i];

            this.respawnTimesRemaining.splice(i, 1);
            this.respawnHutIDs.splice(i, 1);

            if (entityExists(hut)) {
               this.createNewTribesman(hut);
            }

            i--;
         }
      }
   }

   public hasTotem(): boolean {
      return this.totem !== null;
   }

   public respawnTribesman(hut: Entity): void {
      this.respawnTimesRemaining.push(RESPAWN_TIME_TICKS);
      this.respawnHutIDs.push(hut);
   }

   public instantRespawnTribesman(hut: Entity): void {
      this.respawnTimesRemaining.push(1);
      this.respawnHutIDs.push(hut);
   }

   public createNewTribesman(hut: Entity): void {
      // Make sure the hut doesn't already have a tribesman or is in the process of respawning one
      const hutComponent = HutComponentArray.getComponent(hut);
      if (hutComponent.hasSpawnedTribesman || this.respawnHutIDs.indexOf(hut) !== -1) {
         return;
      }

      hutComponent.lastDoorSwingTicks = getGameTicks();
      hutComponent.hasSpawnedTribesman = true;
      hutComponent.hasTribesman = true;
      
      const transformComponent = TransformComponentArray.getComponent(hut);
      
      // Offset the spawn position so the tribesman comes out of the correct side of the hut
      const position = new Point(transformComponent.position.x + 10 * Math.sin(transformComponent.rotation), transformComponent.position.y + 10 * Math.cos(transformComponent.rotation));
      
      let config: EntityConfig<ServerComponentType.transform | ServerComponentType.tribesmanAI>;
      switch (getEntityType(hut)) {
         case EntityType.workerHut: {
            config = createTribeWorkerConfig(this);
            break;
         }
         case EntityType.warriorHut: {
            config = createTribeWarriorConfig(this);
            break;
         }
         default: {
            throw new Error();
         }
      }

      config.components[ServerComponentType.transform].position.x = position.x;
      config.components[ServerComponentType.transform].position.y = position.y;
      config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
      config.components[ServerComponentType.tribesmanAI].hut = hut;
      createEntity(config, getEntityLayer(hut), 0);
   }

   // @Cleanup
   
   public registerNewTribeMember(tribesman: Entity): void {
      this.isRemoveable = true;
      // this.friendlyTribesmenIDs.push(tribeMember.id);
      this.tribesmanIDs.push(tribesman);
   }

   public registerTribeMemberDeath(tribesman: Entity): void {
      const idx = this.tribesmanIDs.indexOf(tribesman);
      if (idx !== -1) {
         this.tribesmanIDs.splice(idx, 1);
      } else {
         console.warn("Tribesman was not in tribe");
      }
   }

   public getNumHuts(): number {
      return this.huts.length;
   }

   /** Destroys the tribe and all its associated buildings */
   // @Incomplete
   private destroy(): void {
      // Remove huts
      for (const hut of this.huts) {
         destroyEntity(hut);
      }

      removeTribe(this);
   }

   private createTribeAreaAroundBuilding(buildingLayer: Layer, buildingPosition: Point, influence: number): void {
      const minTileX = clampToBoardDimensions(Math.floor((buildingPosition.x - influence) / Settings.TILE_SIZE));
      const maxTileX = clampToBoardDimensions(Math.floor((buildingPosition.x + influence) / Settings.TILE_SIZE));
      const minTileY = clampToBoardDimensions(Math.floor((buildingPosition.y - influence) / Settings.TILE_SIZE));
      const maxTileY = clampToBoardDimensions(Math.floor((buildingPosition.y + influence) / Settings.TILE_SIZE));

      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            this.addTileToArea(buildingLayer, tileX, tileY);
         }
      }
   }

   private removeBuildingFromTiles(buildingPosition: Point, influence: number): void {
      const minTileX = clampToBoardDimensions(Math.floor((buildingPosition.x - influence) / Settings.TILE_SIZE));
      const maxTileX = clampToBoardDimensions(Math.floor((buildingPosition.x + influence) / Settings.TILE_SIZE));
      const minTileY = clampToBoardDimensions(Math.floor((buildingPosition.y - influence) / Settings.TILE_SIZE));
      const maxTileY = clampToBoardDimensions(Math.floor((buildingPosition.y + influence) / Settings.TILE_SIZE));

      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            this.removeTileFromArea(tileX, tileY);
         }
      }
   }

   private removeTileFromArea(tileX: number, tileY: number): void {
      const tileIndex = tileY * Settings.BOARD_DIMENSIONS + tileX;
      
      if (!this.area.hasOwnProperty(tileIndex)) {
         return;
      } else {
         this.area[tileIndex].numInfluences--;
         if (this.area[tileIndex].numInfluences === 0) {
            delete this.area[tileIndex];
         }
      }

      const chunkX = Math.floor(tileX / Settings.CHUNK_SIZE);
      const chunkY = Math.floor(tileY / Settings.CHUNK_SIZE);
      const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
      if (!this.chunkArea.hasOwnProperty(chunkIndex)) {
         return;
      } else {
         this.chunkArea[chunkIndex].numInfluences--;
         if (this.chunkArea[chunkIndex].numInfluences === 0) {
            delete this.chunkArea[chunkIndex];
         }
      }
   }

   private addTileToArea(layer: Layer, tileX: number, tileY: number): void {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      
      if (!this.area.hasOwnProperty(tileIndex)) {
         // If the tile isn't in the area, create a new record
         this.area[tileIndex] = {
            tile: tileIndex,
            numInfluences: 1
         };
      } else {
         this.area[tileIndex].numInfluences++;
      }

      const chunkX = Math.floor(tileX / Settings.CHUNK_SIZE);
      const chunkY = Math.floor(tileY / Settings.CHUNK_SIZE);
      const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
      if (!this.chunkArea.hasOwnProperty(chunkIndex)) {
         const chunk = layer.getChunk(chunkX, chunkY);
         this.chunkArea[chunkIndex] = {
            chunk: chunk,
            numInfluences: 1
         };
      } else {
         this.chunkArea[chunkIndex].numInfluences++;
      }
   }

   public tileIsInArea(tileX: number, tileY: number): boolean {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return this.area.hasOwnProperty(tileIndex);
   }

   public numTiles(): number {
      return Object.keys(this.area).length;
   }

   public hasBarrel(barrel: Entity): boolean {
      return this.barrels.includes(barrel);
   }

   public getArea(): Array<TileIndex> {
      const area = new Array<TileIndex>();
      for (const tileInfluence of Object.values(this.area)) {
         area.push(tileInfluence.tile);
      }
      return area;
   }

   public techIsComplete(tech: TechInfo): boolean {
      if (this.techTreeUnlockProgress[tech.id] === undefined) {
         return false;
      }
      
      // Check item requirements
      for (const entry of tech.researchItemRequirements.getEntries()) {
         const itemType = entry.itemType;
         const itemAmountRequired = entry.count;
         
         const progress = this.techTreeUnlockProgress[tech.id]!.itemProgress[itemType];
         if (progress === undefined || progress < itemAmountRequired) {
            return false;
         }
      }

      if (this.techRequiresResearching(tech)) {
         return false;
      }

      return true;
   }

   public studyTech(tech: TechInfo, researcherX: number, researcherY: number, studyAmount: number): void {
      if (!this.techTreeUnlockProgress.hasOwnProperty(tech.id)) {
         this.techTreeUnlockProgress[tech.id] = {
            itemProgress: {},
            studyProgress: studyAmount
         }
      } else {
         this.techTreeUnlockProgress[tech.id]!.studyProgress += studyAmount;
         
         // Don't go over the study requirements
         const techInfo = getTechByID(tech.id);
         if (this.techTreeUnlockProgress[tech.id]!.studyProgress > techInfo.researchStudyRequirements) {
            this.techTreeUnlockProgress[tech.id]!.studyProgress = techInfo.researchStudyRequirements;
         }
      }

      registerResearchOrbComplete({
         x: researcherX,
         y: researcherY,
         amount: studyAmount
      });
   }

   public hasUnlockedTech(techID: TechID): boolean {
      return this.unlockedTechs.indexOf(techID) !== -1;
   }

   public forceUnlockTech(techID: TechID): void {
      const techInfo = getTechByID(techID);
      if (this.hasUnlockedTech(techID) || techInfo.blacklistedTribes.includes(this.tribeType)) {
         return;
      }

      if (!this.techTreeUnlockProgress.hasOwnProperty(techInfo.id)) {
         this.techTreeUnlockProgress[techInfo.id] = {
            itemProgress: {},
            studyProgress: 0
         };
      }
      this.techTreeUnlockProgress[techInfo.id]!.studyProgress = techInfo.researchStudyRequirements;
      for (const entry of techInfo.researchItemRequirements.getEntries()) {
         this.techTreeUnlockProgress[techInfo.id]!.itemProgress[entry.itemType] = entry.count;
      }
      
      this.unlockTech(techInfo.id);
   }

   public unlockAllTechs(): void {
      for (const techInfo of TECHS) {
         this.forceUnlockTech(techInfo.id);
      }
   }

   public techRequiresResearching(tech: TechInfo): boolean {
      if (!this.techTreeUnlockProgress.hasOwnProperty(tech.id)) {
         return true;
      }

      const studyProgress = this.techTreeUnlockProgress[tech.id]!.studyProgress;
      return studyProgress < tech.researchStudyRequirements;
   }

   public updateAvailableResources(): void {
      const newAvailableResources: Partial<Record<ItemType, number>> = {};
      
      for (let i = 0; i < this.barrels.length; i++) {
         const barrel = this.barrels[i];

         const inventoryComponent = InventoryComponentArray.getComponent(barrel);
         const inventory = getInventory(inventoryComponent, InventoryName.inventory);

         for (let i = 0; i < inventory.items.length; i++) {
            const item = inventory.items[i];
            if (!newAvailableResources.hasOwnProperty(item.type)) {
               newAvailableResources[item.type] = item.count;
            } else {
               newAvailableResources[item.type]! += item.count;
            }
         }
      }

      this.availableResources = newAvailableResources;
   }

   public useItemInTechResearch(tech: TechInfo, itemType: ItemType, amount: number): number {
      const amountRequiredToResearch = tech.researchItemRequirements.getItemCount(itemType);
      if (amountRequiredToResearch === 0) {
         return 0;
      }
      
      let amountUsed = 0;

      const techUnlockProgress = this.techTreeUnlockProgress[tech.id];
      if (typeof techUnlockProgress === "undefined") {
         amountUsed = Math.min(amount, amountRequiredToResearch);
         this.techTreeUnlockProgress[tech.id] = {
            itemProgress: { [itemType]: amountUsed },
            studyProgress: 0
         };
      } else if (techUnlockProgress.itemProgress[itemType] === undefined) {
         amountUsed = Math.min(amount, amountRequiredToResearch);
         techUnlockProgress.itemProgress[itemType] = amountUsed;
      } else {
         amountUsed = Math.min(amount, amountRequiredToResearch - techUnlockProgress.itemProgress[itemType]!);
         techUnlockProgress.itemProgress[itemType]! += amountUsed;
      }

      return amountUsed;
   }
}

export default Tribe;