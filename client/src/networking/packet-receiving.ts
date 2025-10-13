import { WaterRockData, RiverSteppingStoneData, GrassTileInfo, RiverFlowDirectionsRecord, WaterRockSize, RiverSteppingStoneSize, EntityDebugData, LineDebugData, CircleDebugData, TileHighlightData, PathData, PathfindingNodeIndex, RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import { PacketReader } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import Game from "../game";
import { refreshCameraView, setCameraPosition } from "../camera";
import { Tile } from "../Tile";
import { addLayer, layers, setCurrentLayer, surfaceLayer } from "../world";
import { NEIGHBOUR_OFFSETS } from "../utils";
import { createRiverSteppingStoneData } from "../rendering/webgl/river-rendering";
import Layer, { getTileIndexIncludingEdges, getTileX, getTileY, tileIsInWorld, tileIsWithinEdge } from "../Layer";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { initialiseRenderables } from "../rendering/render-loop";
import { Biome } from "../../../shared/src/biomes";
import { TileIndex } from "../../../shared/src/utils";
import { playerInstance } from "../player";
import { registerTamingSpecsFromData } from "../taming-specs";
import { addChatMessage } from "../components/game/ChatBox";

const getBuildingBlockingTiles = (): ReadonlySet<TileIndex> => {
   // Initially find all tiles below a dropdown tile
   const buildingBlockingTiles = new Set<TileIndex>();
   for (let tileX = 0; tileX < Settings.WORLD_SIZE_TILES; tileX++) {
      for (let tileY = 0; tileY < Settings.WORLD_SIZE_TILES; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const surfaceTile = surfaceLayer.getTile(tileIndex);
         if (surfaceTile.type === TileType.dropdown) {
            buildingBlockingTiles.add(tileIndex);
         }
      }
   }

   // Expand the tiles to their neighbours
   for (let i = 0; i < 3; i++) {
      const tilesToExpand = Array.from(buildingBlockingTiles);

      for (const tileIndex of tilesToExpand) {
         const tileX = getTileX(tileIndex);
         const tileY = getTileY(tileIndex);
         
         if (tileIsInWorld(tileX + 1, tileY)) {
            buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX + 1, tileY));
         }
         if (tileIsInWorld(tileX, tileY + 1)) {
            buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX, tileY + 1));
         }
         if (tileIsInWorld(tileX - 1, tileY)) {
            buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX - 1, tileY));
         }
         if (tileIsInWorld(tileX, tileY - 1)) {
            buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX, tileY - 1));
         }
      }
   }

   return buildingBlockingTiles;
}

export function processInitialGameDataPacket(reader: PacketReader): void {
   const layerIdx = reader.readNumber();
   
   const spawnPositionX = reader.readNumber();
   const spawnPositionY = reader.readNumber();
   
   // Create layers
   const numLayers = reader.readNumber();
   for (let i = 0; i < numLayers; i++) {
      const tiles = new Array<Tile>();
      const flowDirections: RiverFlowDirectionsRecord = {};
      const grassInfoRecord: Record<number, Record<number, GrassTileInfo>> = {};
      for (let tileIndex = 0; tileIndex < Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES; tileIndex++) {
         const tileType = reader.readNumber() as TileType;
         const tileBiome = reader.readNumber() as Biome;
         const flowDirection = reader.readNumber();
         const temperature = reader.readNumber();
         const humidity = reader.readNumber();
         const mithrilRichness = reader.readNumber();
   
         const tileX = getTileX(tileIndex);
         const tileY = getTileY(tileIndex);
   
         const tile = new Tile(tileX, tileY, tileType, tileBiome, mithrilRichness);
         tiles.push(tile);
   
         if (typeof flowDirections[tileX] === "undefined") {
            flowDirections[tileX] = {};
         }
         flowDirections[tileX]![tileY] = flowDirection;
   
         const grassInfo: GrassTileInfo = {
            tileX: tileX,
            tileY: tileY,
            temperature: temperature,
            humidity: humidity
         };
         if (typeof grassInfoRecord[tileX] === "undefined") {
            grassInfoRecord[tileX] = {};
         }
         grassInfoRecord[tileX]![tileY] = grassInfo;
      }

      // Read in subtiles
      const wallSubtileTypes = new Float32Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES * 16);
      for (let i = 0; i < Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES * 16; i++) {
         const subtileType = reader.readNumber();
         wallSubtileTypes[i] = subtileType;
      }

      // Read subtile damages taken
      const numEntries = reader.readNumber();
      const wallSubtileDamageTakenMap = new Map<number, number>();
      for (let i = 0; i < numEntries; i++) {
         const subtileIndex = reader.readNumber();
         const damageTaken = reader.readNumber();

         wallSubtileDamageTakenMap.set(subtileIndex, damageTaken);
      }

      // Flag all tiles which border water
      for (let i = 0; i < tiles.length; i++) {
         const tile = tiles[i];
         if (tile.type === TileType.water) {
            const tileX = i % (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE * 2) - Settings.EDGE_GENERATION_DISTANCE;
            const tileY = Math.floor(i / (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE * 2)) - Settings.EDGE_GENERATION_DISTANCE;

            for (let j = 0; j < NEIGHBOUR_OFFSETS.length; j++) {
               const neighbourTileX = tileX + NEIGHBOUR_OFFSETS[j][0];
               const neighbourTileY = tileY + NEIGHBOUR_OFFSETS[j][1];

               if (tileIsWithinEdge(neighbourTileX, neighbourTileY)) {
                  const tileIndex = getTileIndexIncludingEdges(neighbourTileX, neighbourTileY);
                  const neighbourTile = tiles[tileIndex];
                  neighbourTile.bordersWater = true;
               }
            }
         }
      }

      const buildingBlockingTiles: ReadonlySet<TileIndex> = i > 0 ? getBuildingBlockingTiles() : new Set();
      const layer = new Layer(i, tiles, buildingBlockingTiles, wallSubtileTypes, wallSubtileDamageTakenMap, flowDirections, [], [], grassInfoRecord);
      addLayer(layer);
   }

   const spawnLayer = layers[layerIdx];

   // Relies on the number of layers
   initialiseRenderables();

   // Set the initial camera position
   setCameraPosition(spawnPositionX, spawnPositionY);
   refreshCameraView();

   setCurrentLayer(spawnLayer);

   // @Hack: how do we know that 
   const surfaceLayer = layers[0];

   const numWaterRocks = reader.readNumber();
   for (let i = 0; i < numWaterRocks; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const rotation = reader.readNumber();
      const size = reader.readNumber() as WaterRockSize;
      const opacity = reader.readNumber();

      const waterRock: WaterRockData = {
         position: [x, y],
         rotation: rotation,
         size: size,
         opacity: opacity
      };
      surfaceLayer.waterRocks.push(waterRock);
   }

   const numSteppingStones = reader.readNumber();
   for (let i = 0; i < numSteppingStones; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const rotation = reader.readNumber();
      const size = reader.readNumber() as RiverSteppingStoneSize;
      const groupID = reader.readNumber();

      const steppingStone: RiverSteppingStoneData = {
         positionX: x,
         positionY: y,
         rotation: rotation,
         size: size,
         groupID: groupID
      };
      surfaceLayer.riverSteppingStones.push(steppingStone);
   }

   // Add river stepping stones to chunks
   for (const steppingStone of surfaceLayer.riverSteppingStones) {
      const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];

      const minChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX - size/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX + size/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY - size/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY + size/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = surfaceLayer.getChunk(chunkX, chunkY);
            chunk.riverSteppingStones.push(steppingStone);
         }
      }
   }

   // @Hack @Temporary
   createRiverSteppingStoneData(surfaceLayer.riverSteppingStones);

   registerTamingSpecsFromData(reader);
}

const readDebugData = (reader: PacketReader): EntityDebugData => {
   const entityID = reader.readNumber();

   const lines = new Array<LineDebugData>();
   const numLines = reader.readNumber();
   for (let i = 0; i < numLines; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const targetX = reader.readNumber();
      const targetY = reader.readNumber();
      const thickness = reader.readNumber();

      lines.push({
         colour: [r, g, b],
         targetPosition: [targetX, targetY],
         thickness: thickness
      });
   }

   const circles = new Array<CircleDebugData>();
   const numCircles = reader.readNumber();
   for (let i = 0; i < numCircles; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const radius = reader.readNumber();
      const thickness = reader.readNumber();

      circles.push({
         colour: [r, g, b],
         radius: radius,
         thickness: thickness
      });
   }

   const tileHighlights = new Array<TileHighlightData>();
   const numTileHighlights = reader.readNumber();
   for (let i = 0; i < numTileHighlights; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const x = reader.readNumber();
      const y = reader.readNumber();

      tileHighlights.push({
         colour: [r, g, b],
         tilePosition: [x, y]
      });
   }
   
   const entries = new Array<string>();
   const numDebugEntries = reader.readNumber();
   for (let i = 0; i < numDebugEntries; i++) {
      const entry = reader.readString();
      entries.push(entry);
   }

   let pathData: PathData | undefined;

   const hasPathData = reader.readBool();
   if (hasPathData) {
      const goalX = reader.readNumber();
      const goalY = reader.readNumber();
      
      const pathNodes = new Array<PathfindingNodeIndex>();
      const numPathNodes = reader.readNumber();
      for (let i = 0; i < numPathNodes; i++) {
         const nodeIndex = reader.readNumber();
         pathNodes.push(nodeIndex);
      }
   
      const rawPathNodes = new Array<PathfindingNodeIndex>();
      const numRawPathNodes = reader.readNumber();
      for (let i = 0; i < numRawPathNodes; i++) {
         const nodeIndex = reader.readNumber();
         rawPathNodes.push(nodeIndex);
      }
   
      const visitedNodes = new Array<PathfindingNodeIndex>();
      const numVisitedNodes = reader.readNumber();
      for (let i = 0; i < numVisitedNodes; i++) {
         const nodeIndex = reader.readNumber();
         visitedNodes.push(nodeIndex);
      }
   
      if (numPathNodes > 0 || numRawPathNodes > 0 || numVisitedNodes > 0) {
         pathData = {
            goalX: goalX,
            goalY: goalY,
            pathNodes: pathNodes,
            rawPathNodes: rawPathNodes,
            visitedNodes: visitedNodes
         };
      }
   }
   
   return {
      entityID: entityID,
      lines: lines,
      circles: circles,
      tileHighlights: tileHighlights,
      debugEntries: entries,
      pathData: pathData
   };
}

export function processSyncDataPacket(reader: PacketReader): void {
   if (!Game.isRunning || playerInstance === null) return;

   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   const playerHitbox = transformComponent.hitboxes[0];
   
   const x = reader.readNumber();
   const y = reader.readNumber();
   const angle = reader.readNumber();

   playerHitbox.previousPosition.x = reader.readNumber();
   playerHitbox.previousPosition.y = reader.readNumber();
   playerHitbox.acceleration.x = reader.readNumber();
   playerHitbox.acceleration.y = reader.readNumber();
   
   playerHitbox.box.position.x = x;
   playerHitbox.box.position.y = y;
   playerHitbox.box.angle = angle;
   
   Game.sync();
}

export function processForcePositionUpdatePacket(reader: PacketReader): void {
   if (playerInstance === null) {
      return;
   }
   
   const x = reader.readNumber();
   const y = reader.readNumber();

   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   const playerHitbox = transformComponent.hitboxes[0];
   playerHitbox.box.position.x = x;
   playerHitbox.box.position.y = y;
}

export function receiveChatMessagePacket(reader: PacketReader): void {
   const username = reader.readString();
   const message = reader.readString();
   addChatMessage(username, message);
}