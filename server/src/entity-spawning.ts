import { EntityType, EntityTypeString } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { randInt, randFloat, TileIndex, Point, getTileIndexIncludingEdges } from "battletribes-shared/utils";
import Layer from "./Layer";
import { addEntityToCensus, getEntityCount, getTilesOfType } from "./census";
import OPTIONS from "./options";
import SRandom from "./SRandom";
import { createEntity } from "./Entity";
import { SERVER } from "./server/server";
import { getDistributionWeightedSpawnPosition } from "./resource-distributions";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { isNight, pushJoinBuffer } from "./world";
import { EntityConfig } from "./components";
import { createCowConfig } from "./entities/mobs/cow";
import { createBerryBushConfig } from "./entities/resources/berry-bush";
import { createTombstoneConfig } from "./entities/tombstone";
import { createBoulderConfig } from "./entities/resources/boulder";
import { createCactusConfig } from "./entities/resources/cactus";
import { createYetiConfig } from "./entities/mobs/yeti";
import { createIceSpikesConfig } from "./entities/resources/ice-spikes";
import { createSlimewispConfig } from "./entities/mobs/slimewisp";
import { createKrumblidConfig } from "./entities/mobs/krumblid";
import { createFrozenYetiConfig } from "./entities/mobs/frozen-yeti";
import { createFishConfig } from "./entities/mobs/fish";
import { createLilypadConfig } from "./entities/lilypad";
import { createGolemConfig } from "./entities/mobs/golem";
import { createTribeWorkerConfig } from "./entities/tribes/tribe-worker";
import { TribeType } from "battletribes-shared/tribes";
import Tribe from "./Tribe";
import { createTreeConfig } from "./entities/resources/tree";
import { EntitySpawnInfo, SPAWN_INFOS, SpawningEntityType } from "./entity-spawn-info";
import { HitboxFlag, updateBox } from "../../shared/src/boxes/boxes";
import { getSubtileIndex } from "../../shared/src/subtiles";
import { surfaceLayer, undergroundLayer } from "./layers";
import { generateMithrilOre } from "./world-generation/mithril-ore-generation";
import { boxIsCollidingWithSubtile } from "../../shared/src/collision";
import { createGlurbConfig } from "./entities/mobs/glurb";

const PACK_SPAWN_RANGE = 200;

let spawnInfoSpawnableTilesRecord: Record<number, ReadonlySet<TileIndex>>;

const findSpawnableTiles = (spawnInfo: EntitySpawnInfo): ReadonlySet<TileIndex> => {
   const spawnableTiles = new Set<TileIndex>();
   
   // @Incomplete: accounts for tiles of all layers instead of just the ones from the layer the spawninfo is in
   for (const tileType of spawnInfo.spawnableTileTypes) {
      const tileIndexes = getTilesOfType(spawnInfo.layer, tileType);
      for (const tileIndex of tileIndexes) {
         if (!spawnInfo.layer.unspawnableTiles.has(tileIndex)) {
            spawnableTiles.add(tileIndex);
         }
      }
   }

   return spawnableTiles;
}

/** Creates the spawn info array and fills their spawnable tiles */
export function noteSpawnableTiles(): void {
   const tempEntitySpawnableTiles: Partial<Record<number, ReadonlySet<TileIndex>>> = {};
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const spawnInfo = SPAWN_INFOS[i];
      tempEntitySpawnableTiles[i] = findSpawnableTiles(spawnInfo);
   }
   spawnInfoSpawnableTilesRecord = tempEntitySpawnableTiles as Record<number, ReadonlySet<TileIndex>>;
}

export function getSpawnInfoSpawnableTiles(spawnInfoIdx: number): ReadonlySet<TileIndex> {
   return spawnInfoSpawnableTilesRecord[spawnInfoIdx];
}

const spawnConditionsAreMet = (spawnInfoIdx: number, spawnInfo: EntitySpawnInfo): boolean => {
   // If there are no tiles upon which the entity is able to be spawned, the spawn conditions aren't valid
   const spawnableTiles = getSpawnInfoSpawnableTiles(spawnInfoIdx);
   const numEligibleTiles = spawnableTiles.size;
   if (numEligibleTiles === 0) return false;
   
   // Check if the entity density is right
   const entityCount = getEntityCount(spawnInfo.entityType);
   const density = entityCount / numEligibleTiles;
   if (density > spawnInfo.maxDensity) {
      return false;
   }

   // Make sure the spawn time is right
   if (spawnInfo.onlySpawnsInNight && !isNight()) {
      return false;
   }
   
   return true;
}

const getTribeType = (layer: Layer, x: number, y: number): TribeType => {
   if (Math.random() < 0.2) {
      return TribeType.goblins;
   }
   
   const tileX = Math.floor(x / Settings.TILE_SIZE);
   const tileY = Math.floor(y / Settings.TILE_SIZE);
   const tileType = layer.getTileXYType(tileX, tileY);
   switch (tileType) {
      case TileType.grass: {
         return TribeType.plainspeople;
      }
      case TileType.sand: {
         return TribeType.barbarians;
      }
      case TileType.snow:
      case TileType.ice: {
         return TribeType.frostlings;
      }
      case TileType.rock: {
         return TribeType.goblins;
      }
      default: {
         return randInt(0, 3);
      }
   }
}

const entityWouldSpawnInWall = (layer: Layer, transformComponent: TransformComponent): boolean => {
   // @Copynpaste from transform component resolveWallCollisions
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitbox.flags.includes(HitboxFlag.IGNORES_WALL_COLLISIONS)) {
         continue;
      }
      
      const box = hitbox.box;
      updateBox(box, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);

      const boundsMinX = box.calculateBoundsMinX();
      const boundsMaxX = box.calculateBoundsMaxX();
      const boundsMinY = box.calculateBoundsMinY();
      const boundsMaxY = box.calculateBoundsMaxY();

      const minSubtileX = Math.max(Math.floor(boundsMinX / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
      const maxSubtileX = Math.min(Math.floor(boundsMaxX / Settings.SUBTILE_SIZE), (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
      const minSubtileY = Math.max(Math.floor(boundsMinY / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
      const maxSubtileY = Math.min(Math.floor(boundsMaxY / Settings.SUBTILE_SIZE), (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);

      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            if (layer.subtileIsWall(subtileIndex) && boxIsCollidingWithSubtile(box, subtileX, subtileY)) {
               return true;
            }
         }
      }
   }

   return false;
}

const attemptToSpawnEntity = (entityType: SpawningEntityType, layer: Layer, x: number, y: number): void => {
   let config: EntityConfig<ServerComponentType.transform>;
   switch (entityType) {
      case EntityType.cow: config = createCowConfig(); break;
      case EntityType.tree: config = createTreeConfig(); break;
      case EntityType.berryBush: config = createBerryBushConfig(); break;
      case EntityType.tombstone: config = createTombstoneConfig(); break;
      case EntityType.boulder: config = createBoulderConfig(); break;
      case EntityType.cactus: config = createCactusConfig(); break;
      case EntityType.yeti: config = createYetiConfig(); break;
      case EntityType.iceSpikes: config = createIceSpikesConfig(0); break;
      case EntityType.slimewisp: config = createSlimewispConfig(); break;
      case EntityType.krumblid: config = createKrumblidConfig(); break;
      case EntityType.frozenYeti: config = createFrozenYetiConfig(); break;
      case EntityType.fish: config = createFishConfig(); break;
      case EntityType.lilypad: config = createLilypadConfig(); break;
      case EntityType.golem: config = createGolemConfig(); break;
      case EntityType.tribeWorker: config = createTribeWorkerConfig(new Tribe(getTribeType(layer, x, y), true, new Point(x, y))); break;
      case EntityType.glurb: config = createGlurbConfig(); break;
   }
   
   const transformComponent = config.components[ServerComponentType.transform];
   transformComponent.position.x = x;
   transformComponent.position.y = y;
   transformComponent.rotation = Math.PI * Math.random();
   
   // Make sure the entity wouldn't spawn in a wall
   if (entityWouldSpawnInWall(layer, transformComponent)) {
      return;
   }

   // Create the entity
   const entity = createEntity(config, layer, 0);
   addEntityToCensus(entity, entityType);
   if (!SERVER.isRunning) {
      pushJoinBuffer(false);
   }
}

const spawnEntities = (spawnInfoIdx: number, spawnInfo: EntitySpawnInfo, spawnOriginX: number, spawnOriginY: number): void => {
   // @Incomplete @Cleanup: Make all cows spawn with the same type,
   // and make fish spawn with the same colour
   
   // const cowSpecies = randInt(0, 1);

   attemptToSpawnEntity(spawnInfo.entityType as SpawningEntityType, spawnInfo.layer, spawnOriginX, spawnOriginY);

   // Pack spawning
 
   const minX = Math.max(spawnOriginX - PACK_SPAWN_RANGE, 0);
   const maxX = Math.min(spawnOriginX + PACK_SPAWN_RANGE, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1);
   const minY = Math.max(spawnOriginY - PACK_SPAWN_RANGE, 0);
   const maxY = Math.min(spawnOriginY + PACK_SPAWN_RANGE, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1);

   let totalSpawnAttempts = 0;

   let spawnCount: number;
   if (OPTIONS.inBenchmarkMode) {
      spawnCount = SRandom.randInt(spawnInfo.minPackSize, spawnInfo.maxPackSize) - 1;
   } else {
      spawnCount = randInt(spawnInfo.minPackSize, spawnInfo.maxPackSize) - 1;
   }

   const spawnableTiles = getSpawnInfoSpawnableTiles(spawnInfoIdx);
   for (let i = 0; i < spawnCount - 1;) {
      if (++totalSpawnAttempts === 100) {
         break;
      }

      // @Speed: Garbage collection, and doing a whole bunch of unnecessary continues here
      
      // Generate a spawn position near the spawn origin
      let spawnPositionX: number;
      let spawnPositionY: number;
      if (OPTIONS.inBenchmarkMode) {
         spawnPositionX = SRandom.randFloat(minX, maxX);
         spawnPositionY = SRandom.randFloat(minY, maxY);
      } else {
         spawnPositionX = randFloat(minX, maxX);
         spawnPositionY = randFloat(minY, maxY);
      }

      const tileX = Math.floor(spawnPositionX / Settings.TILE_SIZE);
      const tileY = Math.floor(spawnPositionY / Settings.TILE_SIZE);
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      if (!spawnableTiles.has(tileIndex)) {
         continue;
      }

      if (spawnPositionIsValid(spawnInfo, spawnPositionX, spawnPositionY)) {
         const x = randInt(minX, maxX);
         const y = randInt(minY, maxY);

         attemptToSpawnEntity(spawnInfo.entityType as SpawningEntityType, spawnInfo.layer, x, y);
         
         i++;
      }
   }
}

export function spawnPositionIsValid(spawnInfo: EntitySpawnInfo, positionX: number, positionY: number): boolean {
   const minChunkX = Math.max(Math.min(Math.floor((positionX - spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((positionX + spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((positionY - spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((positionY + spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);

   // @Incomplete: does this include grass and reeds??
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = spawnInfo.layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            const transformComponent = TransformComponentArray.getComponent(entity);
            
            const distanceSquared = Math.pow(positionX - transformComponent.position.x, 2) + Math.pow(positionY - transformComponent.position.y, 2);
            if (distanceSquared <= spawnInfo.minSpawnDistance * spawnInfo.minSpawnDistance) {
               return false;
            }
         }
      }
   }

   return true;
}

const runSpawnEvent = (spawnInfoIdx: number, spawnInfo: EntitySpawnInfo): void => {
   // Pick a random tile to spawn at
   // @Speed: Instead of randomly picking a tile until it matches the spawnable, pick a random tile from the spawnable tiles
   const tileX = randInt(0, Settings.BOARD_SIZE * Settings.CHUNK_SIZE - 1);
   const tileY = randInt(0, Settings.BOARD_SIZE * Settings.CHUNK_SIZE - 1);
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);

   // If the tile is a valid tile for the spawn info, continue with the spawn event
   const spawnableTiles = getSpawnInfoSpawnableTiles(spawnInfoIdx);
   if (spawnableTiles.has(tileIndex)) {
      // Calculate a random position in that tile to run the spawn at
      let x: number;
      let y: number;
      if (spawnInfo.usesSpawnDistribution) {
         const position = getDistributionWeightedSpawnPosition(spawnInfoIdx);
         x = position.x;
         y = position.y;
      } else {
         x = (tileX + Math.random()) * Settings.TILE_SIZE;
         y = (tileY + Math.random()) * Settings.TILE_SIZE;
      }
      
      if (spawnPositionIsValid(spawnInfo, x, y) && (typeof spawnInfo.customSpawnIsValidFunc === "undefined" || spawnInfo.customSpawnIsValidFunc(spawnInfo, x, y))) {
         spawnEntities(spawnInfoIdx, spawnInfo, x, y);
      }
   }
}

export function runSpawnAttempt(): void {
   if (!OPTIONS.spawnEntities) {
      return;
   }

   // Regular spawning
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const spawnInfo = SPAWN_INFOS[i];
      if (!spawnConditionsAreMet(i, spawnInfo)) {
         continue;
      }

      let numSpawnEvents = Settings.BOARD_SIZE * Settings.BOARD_SIZE * spawnInfo.spawnRate / Settings.TPS;
      if (Math.random() < numSpawnEvents % 1) {
         numSpawnEvents = Math.ceil(numSpawnEvents);
      } else {
         numSpawnEvents = Math.floor(numSpawnEvents);
      }
      for (let j = 0; j < numSpawnEvents; j++) {
         runSpawnEvent(i, spawnInfo);
         if (!spawnConditionsAreMet(i, spawnInfo)) {
            break;
         }
      }
   }

   generateMithrilOre(undergroundLayer, false);
}

export function spawnInitialEntities(): void {
   if (1 + 1 === 3) {
      // @Temporary
      for (let i = 0; i < 20; i++) {
         const tree = createTreeConfig();
         tree.components[ServerComponentType.transform].position.x = Settings.BOARD_UNITS * 0.5 + 200;
         tree.components[ServerComponentType.transform].position.y = Settings.BOARD_UNITS * 0.5 + i * 300;
         createEntity(tree, surfaceLayer, 0);
      }
   
      const cow = createCowConfig();
      cow.components[ServerComponentType.transform].position.x = Settings.BOARD_UNITS * 0.5 - 200;
      cow.components[ServerComponentType.transform].position.y = Settings.BOARD_UNITS * 0.5;
      createEntity(cow, surfaceLayer, 0);
   }

   if (!OPTIONS.spawnEntities) {
      return;
   }

   let numSpawnAttempts: number;

   // For each spawn info object, spawn entities until no more can be spawned
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const spawnInfo = SPAWN_INFOS[i];
      
      numSpawnAttempts = 0;
      while (spawnConditionsAreMet(i, spawnInfo)) {
         runSpawnEvent(i, spawnInfo);

         if (++numSpawnAttempts >= 9999) {
            console.warn("Exceeded maximum number of spawn attempts for " + EntityTypeString[spawnInfo.entityType] + " with " + getEntityCount(spawnInfo.entityType) + " entities.");
            break;
         }
      }
   }

   // @Temporary
   setTimeout(() => {
      if(1+1===2)return;
      // const cow = createCowConfig();
      const cow = createGlurbConfig();
      cow.components[ServerComponentType.transform].position.x = Settings.BOARD_UNITS * 0.5 + 400;
      cow.components[ServerComponentType.transform].position.y = Settings.BOARD_UNITS * 0.5;
      createEntity(cow, surfaceLayer, 0);
      if(1+1===2)return;
      
      // // const x = Settings.BOARD_UNITS * 0.5 + 700;
      const x = 6400;
      // // const y = Settings.BOARD_UNITS * 0.5;
      const y = 3400;
      
      const tribe = new Tribe(TribeType.dwarves, true, new Point(x, y));
      const a = createTribeWorkerConfig(tribe);
      a.components[ServerComponentType.transform].position.x = x;
      a.components[ServerComponentType.transform].position.y = y;
      createEntity(a, undergroundLayer, 0);

      // {
      // const x = Settings.BOARD_UNITS * 0.5 + 800;
      // const y = Settings.BOARD_UNITS * 0.5;
      
      // const a = createCogwalkerConfig(tribe);
      // // const a = createScrappyConfig(tribe);
      // a.components[ServerComponentType.transform].position.x = x;
      // a.components[ServerComponentType.transform].position.y = y;
      // createEntity(a, undergroundLayer, 0);
      // }
   }, 5000);
}