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
import { entityChildIsEntity, TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { getEntityType, isNight, pushJoinBuffer } from "./world";
import { EntityConfig } from "./components";
import { createCowConfig } from "./entities/mobs/cow";
import { createBerryBushConfig } from "./entities/resources/berry-bush";
import { createTombstoneConfig } from "./entities/tombstone";
import { createBoulderConfig } from "./entities/resources/boulder";
import { createCactusConfig } from "./entities/resources/cactus";
import { createYetiConfig } from "./entities/mobs/yeti";
import { createIceSpikesConfig } from "./entities/resources/ice-spikes";
import { createKrumblidConfig } from "./entities/mobs/krumblid";
import { createFrozenYetiConfig } from "./entities/mobs/frozen-yeti";
import { createFishConfig } from "./entities/mobs/fish";
import { createLilypadConfig } from "./entities/lilypad";
import { createGolemConfig } from "./entities/mobs/golem";
import { createTribeWorkerConfig } from "./entities/tribes/tribe-worker";
import { TribeType } from "battletribes-shared/tribes";
import Tribe from "./Tribe";
import { createTreeConfig } from "./entities/resources/tree";
import { EntitySpawnInfo, getDistributionWeightedSpawnPosition, SPAWN_INFOS } from "./entity-spawn-info";
import { HitboxFlag } from "../../shared/src/boxes/boxes";
import { getSubtileIndex } from "../../shared/src/subtiles";
import { surfaceLayer, undergroundLayer } from "./layers";
import { generateMithrilOre } from "./world-generation/mithril-ore-generation";
import { boxIsCollidingWithSubtile } from "../../shared/src/collision";
import { createGlurbConfig } from "./entities/mobs/glurb";
import { generateYetiTerritoryTiles, yetiTerritoryIsValid } from "./components/YetiComponent";
import { createSlimewispConfig } from "./entities/mobs/slimewisp";
import { CollisionGroup, getEntityCollisionGroup } from "../../shared/src/collision-groups";
import { Hitbox } from "./hitboxes";
import { createMossConfig } from "./entities/moss";

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
   if (density >= spawnInfo.maxDensity) {
      return false;
   }

   // Make sure the spawn time is right
   if (spawnInfo.onlySpawnsInNight && !isNight()) {
      return false;
   }
   
   return true;
}

const entityWouldSpawnInWall = (layer: Layer, transformComponent: TransformComponent): boolean => {
   // @Copynpaste from transform component resolveWallCollisions
   for (let i = 0; i < transformComponent.children.length; i++) {
      const child = transformComponent.children[i];
      if (entityChildIsEntity(child)) {
         const childTransformComponent = TransformComponentArray.getComponent(child.attachedEntity);
         if (entityWouldSpawnInWall(layer, childTransformComponent)) {
            return true;
         }
      } else {
         const hitbox = child;
         if (hitbox.flags.includes(HitboxFlag.IGNORES_WALL_COLLISIONS)) {
            continue;
         }
   
         const box = hitbox.box;
   
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
   }

   return false;
}

const attemptToSpawnEntity = (spawnInfo: EntitySpawnInfo, x: number, y: number, firstEntityConfig: EntityConfig | null): EntityConfig | null => {
   // @Bug: If two yetis spawn at once after the server is running, they could potentially have overlapping territories

   const angle = 2 * Math.PI * Math.random();
   
   const config = spawnInfo.createEntity(x, y, angle, firstEntityConfig, spawnInfo.layer);
   if (config === null) {
      return null;
   }

   // @Cleanup: should this be done here, or automatically as the hitboxes are created

   const transformComponent = config.components[ServerComponentType.transform];
   if (typeof transformComponent !== "undefined" && entityWouldSpawnInWall(spawnInfo.layer, transformComponent)) {
      return null;
   }

   // Create the entity
   const entity = createEntity(config, spawnInfo.layer, 0);
   addEntityToCensus(entity, spawnInfo.entityType);
   if (!SERVER.isRunning) {
      pushJoinBuffer(false);
   }

   return config;
}

const spawnEntities = (spawnInfoIdx: number, spawnInfo: EntitySpawnInfo, spawnOriginX: number, spawnOriginY: number): void => {
   // @Incomplete @Cleanup: Make all cows spawn with the same type,
   // and make fish spawn with the same colour
   
   // const cowSpecies = randInt(0, 1);

   const firstEntityConfig = attemptToSpawnEntity(spawnInfo, spawnOriginX, spawnOriginY, null);
   if (firstEntityConfig === null) {
      return;
   }

   // Pack spawning

   if (typeof spawnInfo.packSpawning !== "undefined") {
      const minX = Math.max(spawnOriginX - spawnInfo.packSpawning.spawnRange, 0);
      const maxX = Math.min(spawnOriginX + spawnInfo.packSpawning.spawnRange, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1);
      const minY = Math.max(spawnOriginY - spawnInfo.packSpawning.spawnRange, 0);
      const maxY = Math.min(spawnOriginY + spawnInfo.packSpawning.spawnRange, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1);
   
      let totalSpawnAttempts = 0;
   
      const additionalSpawnCount = randInt(spawnInfo.packSpawning.minPackSize, spawnInfo.packSpawning.maxPackSize) - 1;
   
      const spawnableTiles = getSpawnInfoSpawnableTiles(spawnInfoIdx);
      for (let i = 0; i < additionalSpawnCount;) {
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
   
         if (spawnPositionIsClear(spawnInfo, spawnPositionX, spawnPositionY)) {
            const x = randInt(minX, maxX);
            const y = randInt(minY, maxY);
   
            attemptToSpawnEntity(spawnInfo, x, y, firstEntityConfig);
            
            i++;
         }
      }
   }
}

export function spawnPositionIsClear(spawnInfo: EntitySpawnInfo, positionX: number, positionY: number): boolean {
   const minChunkX = Math.max(Math.min(Math.floor((positionX - spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((positionX + spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((positionY - spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((positionY + spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);

   // @Incomplete: does this include grass and reeds??
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = spawnInfo.layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            // @Hack
            // @Speed: should be skipped entirely
            const entityType = getEntityType(entity);
            const collisionGroup = getEntityCollisionGroup(entityType);
            if (collisionGroup === CollisionGroup.decoration) {
               continue;
            }
            
            const transformComponent = TransformComponentArray.getComponent(entity);
            // @Hack
            const entityHitbox = transformComponent.children[0] as Hitbox;
            
            const distanceSquared = Math.pow(positionX - entityHitbox.box.position.x, 2) + Math.pow(positionY - entityHitbox.box.position.y, 2);
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
   const tileX = randInt(0, Settings.BOARD_DIMENSIONS - 1);
   const tileY = randInt(0, Settings.BOARD_DIMENSIONS - 1);
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);

   // (This is just to uphold the spawn attempt frequency)
   // If the tile is a valid tile for the spawn info, continue with the spawn event
   const spawnableTiles = getSpawnInfoSpawnableTiles(spawnInfoIdx);
   if (spawnableTiles.has(tileIndex)) {
      // Calculate a random position in that tile to run the spawn at
      let x: number;
      let y: number;
      if (typeof spawnInfo.spawnDistribution !== "undefined") {
         const position = getDistributionWeightedSpawnPosition(spawnInfoIdx, spawnInfo.spawnDistribution);
         x = position.x;
         y = position.y;
      } else {
         x = (tileX + Math.random()) * Settings.TILE_SIZE;
         y = (tileY + Math.random()) * Settings.TILE_SIZE;
      }
      
      if (spawnPositionIsClear(spawnInfo, x, y) && (typeof spawnInfo.customSpawnIsValidFunc === "undefined" || spawnInfo.customSpawnIsValidFunc(spawnInfo, x, y))) {
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
      // const config = createCowConfig(new Point(Settings.BOARD_UNITS * 0.5 + 400, Settings.BOARD_UNITS * 0.5), 0);
      // createEntity(config, surfaceLayer, 0);
      if(1+1===2)return;
      const config = createGlurbConfig(Settings.BOARD_UNITS * 0.5 + 200, Settings.BOARD_UNITS * 0.5, 0);
      createEntity(config, surfaceLayer, 0);

      if(1+1===2)return;
      
      // // const x = Settings.BOARD_UNITS * 0.5 + 700;
      const x = 6400;
      // // const y = Settings.BOARD_UNITS * 0.5;
      const y = 3400;
      
      // const tribe = new Tribe(TribeType.dwarves, true, new Point(x, y));
      // const a = createTribeWorkerConfig(tribe);
      // a.components[ServerComponentType.transform].position.x = x;
      // a.components[ServerComponentType.transform].position.y = y;
      // createEntity(a, undergroundLayer, 0);

      // {
      // const x = Settings.BOARD_UNITS * 0.5 + 800;
      // const y = Settings.BOARD_UNITS * 0.5;
      
      // const a = createCogwalkerConfig(tribe);
      // // const a = createScrappyConfig(tribe);
      // a.components[ServerComponentType.transform].position.x = x;
      // a.components[ServerComponentType.transform].position.y = y;
      // createEntity(a, undergroundLayer, 0);
      // }
   }, 1100);
}