import { WaterRockData, RiverSteppingStoneData, ServerTileUpdateData } from "battletribes-shared/client-server-types";
import { Entity } from "battletribes-shared/entities";
import { PathfindingSettings, Settings } from "battletribes-shared/settings";
import { NUM_TILE_TYPES, SubtileType, TileType } from "battletribes-shared/tiles";
import { distance, Point, TileIndex } from "battletribes-shared/utils";
import { Biome } from "battletribes-shared/biomes";
import { CollisionGroup } from "battletribes-shared/collision-groups";
import { getSubtileIndex } from "battletribes-shared/subtiles";
import Chunk from "./Chunk";
import CollisionChunk from "./CollisionChunk";
import { EntityPairCollisionInfo, GlobalCollisionInfo } from "./collision-detection";
import { MinedSubtileInfo } from "./collapses";
import { getPathfindingNode, PathfindingServerVars } from "./pathfinding-utils";

interface WallSubtileUpdate {
   readonly subtileIndex: number;
   readonly subtileType: SubtileType;
   readonly damageTaken: number;
}

interface TileCensus {
   readonly types: Record<TileType, Array<TileIndex>>;
   biomes: Record<Biome, Array<TileIndex>>;
}

const createTileCensus = (): TileCensus => {
   return {
      types: (() => {
         const types: Partial<Record<TileType, Array<TileIndex>>> = {};
         for (let tileType: TileType = 0; tileType < NUM_TILE_TYPES; tileType++) {
            types[tileType] = [];
         }
         return types as Record<TileType, Array<TileIndex>>;
      })(),
      biomes: (() => {
         const biomes: Partial<Record<Biome, Array<TileIndex>>> = {};
         for (let biome: Biome = 0; biome < Biome._LENGTH_; biome++) {
            biomes[biome] = [];
         }
         return biomes as Record<Biome, Array<TileIndex>>;
      })()
   };
}

const createNodeGroupIDs = (): Array<Array<number>> => {
   const nodeGroupIDs = new Array<Array<number>>();

   for (let i = 0; i < PathfindingSettings.NODES_IN_WORLD_WIDTH * PathfindingSettings.NODES_IN_WORLD_WIDTH; i++) {
      const groupIDs = new Array<number>();
      nodeGroupIDs.push(groupIDs);
   }

   // Mark borders as inaccessible

   // Bottom border
   for (let nodeX = 0; nodeX < PathfindingSettings.NODES_IN_WORLD_WIDTH - 2; nodeX++) {
      const node = getPathfindingNode(nodeX, -1);
      nodeGroupIDs[node].push(PathfindingServerVars.WALL_TILE_OCCUPIED_ID);
   }
   // Top border
   for (let nodeX = 0; nodeX < PathfindingSettings.NODES_IN_WORLD_WIDTH - 2; nodeX++) {
      const node = getPathfindingNode(nodeX, PathfindingSettings.NODES_IN_WORLD_WIDTH - 2);
      nodeGroupIDs[node].push(PathfindingServerVars.WALL_TILE_OCCUPIED_ID);
   }
   // Left border
   for (let nodeY = -1; nodeY < PathfindingSettings.NODES_IN_WORLD_WIDTH - 1; nodeY++) {
      const node = getPathfindingNode(-1, nodeY);
      nodeGroupIDs[node].push(PathfindingServerVars.WALL_TILE_OCCUPIED_ID);
   }
   // Right border
   for (let nodeY = -1; nodeY < PathfindingSettings.NODES_IN_WORLD_WIDTH - 1; nodeY++) {
      const node = getPathfindingNode(PathfindingSettings.NODES_IN_WORLD_WIDTH - 2, nodeY);
      nodeGroupIDs[node].push(PathfindingServerVars.WALL_TILE_OCCUPIED_ID);
   }
   
   return nodeGroupIDs;
}

export function getTileIndexIncludingEdges(tileX: number, tileY: number): TileIndex {
   return (tileY + Settings.EDGE_GENERATION_DISTANCE) * Settings.FULL_BOARD_DIMENSIONS + tileX + Settings.EDGE_GENERATION_DISTANCE;
}

export function getTileX(tileIndex: TileIndex): number {
   return tileIndex % Settings.FULL_BOARD_DIMENSIONS - Settings.EDGE_GENERATION_DISTANCE;
}

export function getTileY(tileIndex: TileIndex): number {
   return Math.floor(tileIndex / Settings.FULL_BOARD_DIMENSIONS) - Settings.EDGE_GENERATION_DISTANCE;
}

export function tileIsInWorld(tileX: number, tileY: number): boolean {
   return tileX >= 0 && tileX < Settings.BOARD_DIMENSIONS && tileY >= 0 && tileY < Settings.BOARD_DIMENSIONS;
}

export function tileIsInWorldIncludingEdges(tileX: number, tileY: number): boolean {
   return tileX >= -Settings.EDGE_GENERATION_DISTANCE && tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY >= -Settings.EDGE_GENERATION_DISTANCE && tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE;
}

export function positionIsInWorld(x: number, y: number): boolean {
   return x >= 0 && x < Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE && y >= 0 && y < Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE;
}

export function getTileIndexFromPos(x: number, y: number): TileIndex {
   const tileX = Math.floor(x / Settings.TILE_SIZE);
   const tileY = Math.floor(y / Settings.TILE_SIZE);
   return getTileIndexIncludingEdges(tileX, tileY);
}

export function getChunkIndex(chunkX: number, chunkY: number): number {
   return chunkY * Settings.BOARD_SIZE + chunkX;
}

const createInitialChunksArray = (): Array<Chunk> => {
   const chunks = new Array<Chunk>();
   for (let i = 0; i < Settings.BOARD_SIZE * Settings.BOARD_SIZE; i++) {
      const chunk = new Chunk();
      chunks.push(chunk);
   }
   return chunks;
}

const createCollisionGroupChunks = (): Record<CollisionGroup, ReadonlyArray<CollisionChunk>> => {
   const collisionGroupChunks: Partial<Record<CollisionGroup, ReadonlyArray<CollisionChunk>>>= {};

   for (let collisionGroup: CollisionGroup = 0; collisionGroup < CollisionGroup._LENGTH_; collisionGroup++) {
      const chunks = new Array<CollisionChunk>();
      for (let i = 0; i < Settings.BOARD_SIZE * Settings.BOARD_SIZE; i++) {
         const chunk = new CollisionChunk();
         chunks.push(chunk);
      }
      collisionGroupChunks[collisionGroup] = chunks;
   }

   return collisionGroupChunks as Record<CollisionGroup, ReadonlyArray<CollisionChunk>>;
}

export default class Layer {
   /** The depth of the layer, also the layer's index in the layers array. Surface layer has depth 0, and each subsequently lower layer has 1 higher depth. */
   public readonly depth: number;
   
   public readonly tileTypes = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   public readonly tileBiomes = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   public readonly riverFlowDirections = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   public readonly tileTemperatures = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   public readonly tileHumidities = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);

   public readonly tileCensus = createTileCensus();

   public readonly wallSubtileTypes = new Float32Array(16 * Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);

   public readonly wallSubtileDamageTakenMap = new Map<number, number>();

   public readonly waterRocks = new Array<WaterRockData>();
   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   private tileUpdateCoordinates = new Set<number>();
   public wallSubtileUpdates = new Array<WallSubtileUpdate>();

   /** Stores all entities collectively in each chunk */
   public chunks = createInitialChunksArray();

   public readonly collisionGroupChunks = createCollisionGroupChunks();

   public globalCollisionInfo: GlobalCollisionInfo = {};

   public minedSubtileInfoMap = new Map<number, MinedSubtileInfo>();

   public readonly nodeGroupIDs = createNodeGroupIDs();

   constructor(depth: number) {
      this.depth = depth;

      // @Incomplete: this is broken. fix it by making river stepping stones into entities
      // Add river stepping stones to chunks
      // for (const steppingStoneData of generationInfo.riverSteppingStones) {
      //    const size = RIVER_STEPPING_STONE_SIZES[steppingStoneData.size];
      //    const minChunkX = Math.max(Math.min(Math.floor((steppingStoneData.positionX - size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      //    const maxChunkX = Math.max(Math.min(Math.floor((steppingStoneData.positionX + size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      //    const minChunkY = Math.max(Math.min(Math.floor((steppingStoneData.positionY - size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      //    const maxChunkY = Math.max(Math.min(Math.floor((steppingStoneData.positionY + size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         
      //    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      //       for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      //          const chunk = this.getChunk(chunkX, chunkY);
      //          chunk.riverSteppingStones.push(steppingStoneData);
      //       }
      //    }
      // }
   }

   public getSubtileTypes(): Readonly<Float32Array> {
      return this.wallSubtileTypes;
   }

   public getMinedSubtileType(subtileIndex: number): SubtileType {
      const minedSubtileInfo = this.minedSubtileInfoMap.get(subtileIndex);
      console.assert(typeof minedSubtileInfo !== "undefined");

      return minedSubtileInfo!.subtileType;
   }

   public restoreWallSubtile(subtileIndex: number, subtileType: SubtileType): void {
      this.wallSubtileTypes[subtileIndex] = subtileType;
      
      this.minedSubtileInfoMap.delete(subtileIndex);
      
      this.wallSubtileUpdates.push({
         subtileIndex: subtileIndex,
         subtileType: subtileType,
         damageTaken: 0
      });
   }

   public getTileType(tileIndex: number): TileType {
      return this.tileTypes[tileIndex];
   }
   
   public getTileXYType(tileX: number, tileY: number): TileType {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return this.tileTypes[tileIndex];
   }
   
   public getTileTypeAtPosition(x: number, y: number): TileType {
      const tileX = Math.floor(x / Settings.TILE_SIZE);
      const tileY = Math.floor(y / Settings.TILE_SIZE);
      return this.getTileXYType(tileX, tileY);
   }

   public getSubtileType(subtileIndex: number): SubtileType {
      return this.wallSubtileTypes[subtileIndex];
   }

   public getSubtileXYType(subtileX: number, subtileY: number): SubtileType {
      const subtileIndex = getSubtileIndex(subtileX, subtileY);
      return this.wallSubtileTypes[subtileIndex];
   }

   public subtileIsWall(subtileIndex: number): boolean {
      return this.wallSubtileTypes[subtileIndex] !== SubtileType.none;
   }

   public subtileCanHaveWall(subtileIndex: number): boolean {
      return this.wallSubtileTypes[subtileIndex] !== SubtileType.none || this.wallSubtileDamageTakenMap.has(subtileIndex);
   }

   /** Returns if the given subtile can support a wall but is mined out */
   public subtileIsMined(subtileIndex: number): boolean {
      return this.wallSubtileTypes[subtileIndex] === SubtileType.none && this.wallSubtileDamageTakenMap.has(subtileIndex);
   }

   public positionHasWall(x: number, y: number): boolean {
      const subtileX = Math.floor(x / Settings.SUBTILE_SIZE);
      const subtileY = Math.floor(y / Settings.SUBTILE_SIZE);

      const subtileIndex = getSubtileIndex(subtileX, subtileY);
      return this.subtileIsWall(subtileIndex);
   }

   public getTileBiome(tileIndex: TileIndex): Biome {
      return this.tileBiomes[tileIndex];
   }

   public getTileXYBiome(tileX: number, tileY: number): Biome {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return this.tileBiomes[tileIndex];
   }

   public getBiomeAtPosition(x: number, y: number): Biome {
      const tileX = Math.floor(x / Settings.TILE_SIZE);
      const tileY = Math.floor(y / Settings.TILE_SIZE);

      return this.getTileXYBiome(tileX, tileY);
   }

   public getChunk(chunkX: number, chunkY: number): Chunk {
      const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
      return this.chunks[chunkIndex];
   }

   // @Temporary
   public getChunkIndex(chunk: Chunk): number {
      const idx = this.chunks.indexOf(chunk);
      if (idx === -1) {
         throw new Error();
      }
      return idx;
   }

   public getChunkByIndex(chunkIndex: number): Chunk {
      return this.chunks[chunkIndex];
   }

   public getCollisionChunkByIndex(collisionGroup: CollisionGroup, chunkIndex: number): CollisionChunk {
      return this.collisionGroupChunks[collisionGroup][chunkIndex];
   }

   public getEntityCollisionPairs(entity: Entity): ReadonlyArray<EntityPairCollisionInfo> {
      return this.globalCollisionInfo[entity] || [];
   }

   /** Registers a tile update to be sent to the clients */
   public registerNewTileUpdate(x: number, y: number): void {
      const tileIndex = y * Settings.BOARD_DIMENSIONS + x;
      this.tileUpdateCoordinates.add(tileIndex);
   }

   /** Get all tile updates and reset them */
   public popTileUpdates(): ReadonlyArray<ServerTileUpdateData> {
      // Generate the tile updates array
      const tileUpdates = new Array<ServerTileUpdateData>();
      for (const tileIndex of this.tileUpdateCoordinates) {
         const tileX = tileIndex % Settings.BOARD_DIMENSIONS;
         const tileY = Math.floor(tileIndex / Settings.BOARD_DIMENSIONS);
         
         tileUpdates.push({
            layerIdx: this.depth,
            tileIndex: tileIndex,
            type: this.getTileXYType(tileX, tileY)
         });
      }

      // reset the tile update coordiantes
      this.tileUpdateCoordinates.clear();

      return tileUpdates;
   }

   public static isInBoard(position: Point): boolean {
      return position.x >= 0 && position.x <= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1 && position.y >= 0 && position.y <= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1;
   }

   public getChunksInBounds(minX: number, maxX: number, minY: number, maxY: number): ReadonlyArray<Chunk> {
      const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   
      const chunks = new Array<Chunk>();
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = this.getChunk(chunkX, chunkY);
            chunks.push(chunk);
         }
      }
   
      return chunks;
   }

   /** Returns false if any of the tiles in the raycast don't match the inputted tile types. */
   public tileRaytraceMatchesTileTypes(startX: number, startY: number, endX: number, endY: number, tileTypes: ReadonlyArray<TileType>): boolean {
      /*
      Kindly yoinked from https://playtechs.blogspot.com/2007/03/raytracing-on-grid.html
      */
      
      // Convert to tile coordinates
      const x0 = startX / Settings.TILE_SIZE;
      const x1 = endX / Settings.TILE_SIZE;
      const y0 = startY / Settings.TILE_SIZE;
      const y1 = endY / Settings.TILE_SIZE;
      
      const dx = Math.abs(x0 - x1);
      const dy = Math.abs(y0 - y1);
   
      // Starting tile coordinates
      let x = Math.floor(x0);
      let y = Math.floor(y0);
   
      const dt_dx = 1 / dx;
      const dt_dy = 1 / dy;
   
      let n = 1;
      let x_inc, y_inc;
      let t_next_vertical, t_next_horizontal;
   
      if (dx === 0) {
         x_inc = 0;
         t_next_horizontal = dt_dx; // Infinity
      } else if (x1 > x0) {
         x_inc = 1;
         n += Math.floor(x1) - x;
         t_next_horizontal = (Math.floor(x0) + 1 - x0) * dt_dx;
      } else {
         x_inc = -1;
         n += x - Math.floor(x1);
         t_next_horizontal = (x0 - Math.floor(x0)) * dt_dx;
      }
   
      if (dy === 0) {
         y_inc = 0;
         t_next_vertical = dt_dy; // Infinity
      } else if (y1 > y0) {
         y_inc = 1;
         n += Math.floor(y1) - y;
         t_next_vertical = (Math.floor(y0) + 1 - y0) * dt_dy;
      } else {
         y_inc = -1;
         n += y - Math.floor(y1);
         t_next_vertical = (y0 - Math.floor(y0)) * dt_dy;
      }
   
      for (; n > 0; n--) {
         const tileType = this.getTileXYType(x, y);
         if (!tileTypes.includes(tileType)) {
            return false;
         }
   
         if (t_next_vertical < t_next_horizontal) {
            y += y_inc;
            t_next_vertical += dt_dy;
         } else {
            x += x_inc;
            t_next_horizontal += dt_dx;
         }
      }
   
      return true;
   }
   
   // @Cleanup: Copy and paste
   public raytraceHasWallSubtile(startX: number, startY: number, endX: number, endY: number): boolean {
      /*
      Kindly yoinked from https://playtechs.blogspot.com/2007/03/raytracing-on-grid.html
      */
      
      // Convert to subtile coordinates
      const x0 = startX / Settings.SUBTILE_SIZE;
      const y0 = startY / Settings.SUBTILE_SIZE;
      const x1 = endX / Settings.SUBTILE_SIZE;
      const y1 = endY / Settings.SUBTILE_SIZE;
      
      const dx = Math.abs(x0 - x1);
      const dy = Math.abs(y0 - y1);
   
      // Starting subtile coordinates
      let x = Math.floor(x0);
      let y = Math.floor(y0);
   
      const dt_dx = 1 / dx;
      const dt_dy = 1 / dy;
   
      let n = 1;
      let x_inc, y_inc;
      let t_next_vertical, t_next_horizontal;
   
      if (dx === 0) {
         x_inc = 0;
         t_next_horizontal = dt_dx; // Infinity
      } else if (x1 > x0) {
         x_inc = 1;
         n += Math.floor(x1) - x;
         t_next_horizontal = (Math.floor(x0) + 1 - x0) * dt_dx;
      } else {
         x_inc = -1;
         n += x - Math.floor(x1);
         t_next_horizontal = (x0 - Math.floor(x0)) * dt_dx;
      }
   
      if (dy === 0) {
         y_inc = 0;
         t_next_vertical = dt_dy; // Infinity
      } else if (y1 > y0) {
         y_inc = 1;
         n += Math.floor(y1) - y;
         t_next_vertical = (Math.floor(y0) + 1 - y0) * dt_dy;
      } else {
         y_inc = -1;
         n += y - Math.floor(y1);
         t_next_vertical = (y0 - Math.floor(y0)) * dt_dy;
      }
   
      for (; n > 0; n--) {
         const subtileIndex = getSubtileIndex(x, y);
         if (this.subtileIsWall(subtileIndex)) {
            return true;
         }
   
         if (t_next_vertical < t_next_horizontal) {
            y += y_inc;
            t_next_vertical += dt_dy;
         } else {
            x += x_inc;
            t_next_horizontal += dt_dx;
         }
      }
   
      return false;
   }
}

const tileIsInRange = (x: number, y: number, range: number, tileX: number, tileY: number): boolean => {
   const blX = tileX * Settings.TILE_SIZE;
   const blY = tileY * Settings.TILE_SIZE;
   if (distance(x, y, blX, blY) <= range) {
      return true;
   }
   
   const brX = (tileX + 1) * Settings.TILE_SIZE;
   const brY = tileY * Settings.TILE_SIZE;
   if (distance(x, y, brX, brY) <= range) {
      return true;
   }

   const tlX = tileX * Settings.TILE_SIZE;
   const tlY = (tileY + 1) * Settings.TILE_SIZE;
   if (distance(x, y, tlX, tlY) <= range) {
      return true;
   }

   const trX = (tileX + 1) * Settings.TILE_SIZE;
   const trY = (tileY + 1) * Settings.TILE_SIZE;
   if (distance(x, y, trX, trY) <= range) {
      return true;
   }

   return false;
}

export function getTilesInRange(x: number, y: number, range: number): ReadonlyArray<TileIndex> {
   const minTileX = Math.floor((x - range) / Settings.TILE_SIZE);
   const maxTileX = Math.floor((x + range) / Settings.TILE_SIZE);
   const minTileY = Math.floor((y - range) / Settings.TILE_SIZE);
   const maxTileY = Math.floor((y + range) / Settings.TILE_SIZE);

   const tiles = new Array<TileIndex>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         if (tileIsInRange(x, y, range, tileX, tileY)) {
            const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
            tiles.push(tileIndex);
         }
      }
   }
   return tiles;
}