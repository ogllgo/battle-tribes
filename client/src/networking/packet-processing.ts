import { WaterRockData, RiverSteppingStoneData, GrassTileInfo, RiverFlowDirectionsRecord, WaterRockSize, RiverSteppingStoneSize, GameDataPacket, HitData, PlayerKnockbackData, HealData, ServerTileUpdateData, EntityDebugData, LineDebugData, CircleDebugData, TileHighlightData, PathData, PathfindingNodeIndex, RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { SubtileType, TileType } from "battletribes-shared/tiles";
import { readCrossbowLoadProgressRecord } from "../entity-components/server-components/InventoryUseComponent";
import { TribesmanTitle } from "battletribes-shared/titles";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import Game from "../Game";
import Client from "./Client";
import Board from "../Board";
import Camera from "../Camera";
import { updateDebugScreenIsPaused, updateDebugScreenTicks, updateDebugScreenCurrentTime, registerServerTick } from "../components/game/dev/GameInfoDisplay";
import { Tile } from "../Tile";
import { getComponentArrays, getServerComponentArray } from "../entity-components/ComponentArray";
import { createEntity, addLayer, changeEntityLayer, entityExists, EntityServerComponentParams, getCurrentLayer, getEntityLayer, getEntityRenderInfo, layers, registerBasicEntityInfo, removeEntity, setCurrentLayer, getEntityAgeTicks, EntityPreCreationInfo, surfaceLayer } from "../world";
import { isDev, NEIGHBOUR_OFFSETS } from "../utils";
import { createRiverSteppingStoneData } from "../rendering/webgl/river-rendering";
import Layer, { getTileIndexIncludingEdges, getTileX, getTileY, tileIsInWorld, tileIsWithinEdge } from "../Layer";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { playSound } from "../sound";
import { initialiseRenderables } from "../rendering/render-loop";
import { PhysicsComponentArray } from "../entity-components/server-components/PhysicsComponent";
import ServerComponentArray from "../entity-components/ServerComponentArray";
import { MinedSubtile, setMinedSubtiles, tickCollapse } from "../collapses";
import { createResearchNumber } from "../text-canvas";
import { registerDirtyRenderInfo, registerDirtyRenderPosition } from "../rendering/render-part-matrices";
import { Biome } from "../../../shared/src/biomes";
import { ExtendedTribeInfo, readExtendedTribeData, readShortTribeData, TribeData, tribes, updatePlayerTribe } from "../tribes";
import { readPacketDevData } from "./dev-packet-processing";
import { TileIndex } from "../../../shared/src/utils";
import { playerInstance, setPlayerInstance } from "../player";
import { gameScreenSetIsDead } from "../components/game/GameScreen";
import { selectItemSlot } from "../components/game/GameInteractableLayer";
import { GrassBlocker } from "../../../shared/src/grass-blockers";
import { updateGrassBlockers } from "../grass-blockers";

const getBuildingBlockingTiles = (): ReadonlySet<TileIndex> => {
   // Initially find all tiles below a dropdown tile
   const buildingBlockingTiles = new Set<TileIndex>();
   for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
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
      for (let tileIndex = 0; tileIndex < Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS; tileIndex++) {
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
      const wallSubtileTypes = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS * 16);
      for (let i = 0; i < Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS * 16; i++) {
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
            const tileX = i % (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2) - Settings.EDGE_GENERATION_DISTANCE;
            const tileY = Math.floor(i / (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2)) - Settings.EDGE_GENERATION_DISTANCE;

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

   // Relies on the number of layers
   initialiseRenderables();

   // Set the initial camera position
   Camera.setPosition(spawnPositionX, spawnPositionY);
   Camera.setInitialVisibleChunkBounds(layers[layerIdx]);

   // @Temporary @Hack
   setCurrentLayer(0);

   // @Hack
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

      const minChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX - size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX + size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY - size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY + size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = surfaceLayer.getChunk(chunkX, chunkY);
            chunk.riverSteppingStones.push(steppingStone);
         }
      }
   }

   // @Hack @Temporary
   createRiverSteppingStoneData(surfaceLayer.riverSteppingStones);
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

   const hasPathData = reader.readBoolean();
   reader.padOffset(3);
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

const processPlayerUpdateData = (reader: PacketReader): void => {
   if (playerInstance === null) {
      throw new Error();
   }
   
   // Skip entity type and spawn ticks
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

   // @Copynpaste
   const layerIdx = reader.readNumber();
   const layer = layers[layerIdx];
   const previousLayer = getEntityLayer(playerInstance);
   if (layer !== previousLayer) {
      // Change layers
      changeEntityLayer(playerInstance, layer);
   }
   
   const numComponents = reader.readNumber();
   for (let i = 0; i < numComponents; i++) {
      const componentType = reader.readNumber() as ServerComponentType;
      const componentArray = getServerComponentArray(componentType);

      if (typeof componentArray.updatePlayerFromData !== "undefined") {
         componentArray.updatePlayerFromData(reader, false);
      } else {
         componentArray.padData(reader);
      }
   }

   // @Speed
   const componentArrays = getComponentArrays();
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (componentArray.hasComponent(playerInstance) && typeof (componentArray as ServerComponentArray).updatePlayerAfterData !== "undefined") {
         (componentArray as ServerComponentArray).updatePlayerAfterData!();
      }
   }

      // @Incomplete
      // const leftThrownBattleaxeItemID = entityData.clientArgs[14] as number;
      // player.leftThrownBattleaxeItemID = leftThrownBattleaxeItemID;
      // Hotbar_updateLeftThrownBattleaxeItemID(leftThrownBattleaxeItemID);
}

export function processEntityCreationData(entity: Entity, reader: PacketReader): void {
   // @Cleanup: might be able to be cleaned up by making a separate processPlayerCreationData
   
   const entityType = reader.readNumber() as EntityType;
   const spawnTicks = reader.readNumber();
   const layerIdx = reader.readNumber();

   const entityServerComponentTypes = new Array<ServerComponentType>();
   const serverComponentParams = {} as EntityServerComponentParams;
   
   // Create component params
   const numComponents = reader.readNumber();
   for (let i = 0; i < numComponents; i++) {
      const componentType = reader.readNumber() as ServerComponentType;
      entityServerComponentTypes.push(componentType);

      const componentArray = getServerComponentArray(componentType);

      const params = componentArray.createParamsFromData(reader);
      // @Cleanup: cast
      serverComponentParams[componentType] = params as any;
   }

   const layer = layers[layerIdx];
   
   const preCreationInfo: EntityPreCreationInfo<ServerComponentType> = {
      serverComponentTypes: entityServerComponentTypes,
      serverComponentParams: serverComponentParams
   };
   
   const creationInfo = createEntity(entity, entityType, layer, preCreationInfo);

   registerBasicEntityInfo(entity, entityType, spawnTicks, layer, creationInfo.renderInfo);
   
   // @Cleanup: In both this and the placeable entity ghost entity stuff, after calling createEntity, we either set the renderPosition
   // or mark that it should be updated. So perhaps it would be better if in the createEntity function we deduce the initial value of renderPosition,
   // which would remove the need for these two behaviours.
   registerDirtyRenderPosition(creationInfo.renderInfo);
   
   // @Incomplete: add components to component arrays here
   
   // Call onLoad functions
   const componentArrays = getComponentArrays();
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (typeof componentArray.onLoad !== "undefined" && componentArray.hasComponent(entity)) {
         componentArray.onLoad(entity);
      }
   }

   const renderInfo = getEntityRenderInfo(entity);
   layer.addEntityToRendering(entity, renderInfo.renderLayer, renderInfo.renderHeight);

   // Set the player instance
   if (entity === playerInstance) {
      setPlayerInstance(entity);

      // @Speed @Copynpaste
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (componentArray.hasComponent(playerInstance!) && typeof (componentArray as ServerComponentArray).updatePlayerAfterData !== "undefined") {
            (componentArray as ServerComponentArray).updatePlayerAfterData!();
         }
      }
   }

   // If the entity has first spawned in, call any spawn functions
   const ageTicks = getEntityAgeTicks(entity);
   if (ageTicks === 0) {
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (componentArray.hasComponent(entity) && typeof componentArray.onSpawn !== "undefined") {
            componentArray.onSpawn(entity);
         }
      }
   }
}

const processEntityUpdateData = (entity: Entity, reader: PacketReader): void => {
   // Skip entity type and spawn ticks
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

   const layerIdx = reader.readNumber();
   const layer = layers[layerIdx];
   const previousLayer = getEntityLayer(entity);
   if (layer !== previousLayer) {
      // Change layers
      changeEntityLayer(entity, layer);
   }
   
   const numComponents = reader.readNumber();
   for (let i = 0; i < numComponents; i++) {
      const componentType = reader.readNumber() as ServerComponentType;
      const componentArray = getServerComponentArray(componentType);
      
      componentArray.updateFromData(reader, entity);
   }

   // @Speed: Does this mean we can just collect all updated entities each tick and not have to do the dirty array bullshit?
   // If you're updating the entity, then the server must have had some reason to send the data, so we should always consider the entity dirty.
   // @Incomplete: Are there some situations where this isn't the case?
   const renderInfo = getEntityRenderInfo(entity);
   registerDirtyRenderInfo(renderInfo);
}

export function processGameDataPacket(reader: PacketReader): void {
   registerServerTick();
   
   const simulationIsPaused = reader.readBoolean();
   reader.padOffset(3);
   updateDebugScreenIsPaused(simulationIsPaused);

   const ticks = reader.readNumber();
   const time = reader.readNumber();

   const layerIdx = reader.readNumber();
   const playerLayer = layers[layerIdx];

   // @hack @Temporary
   const startLayer = getCurrentLayer();

   if (playerLayer !== startLayer) {
      setCurrentLayer(layerIdx);
      playSound("layer-change.mp3", 0.55, 1, Camera.position.copy(), null);
   }

   const newPlayerInstance = reader.readNumber();
   if (playerInstance === null && newPlayerInstance !== 0) {
      setPlayerInstance(newPlayerInstance);

      selectItemSlot(1);
      gameScreenSetIsDead(false);
   }
   const cameraSubject = reader.readNumber() as Entity;
   Camera.setTrackedEntityID(cameraSubject);

   Board.serverTicks = ticks;
   updateDebugScreenTicks(ticks);
   Board.time = time;
   updateDebugScreenCurrentTime(time);

   // Tribes
   // @Temporary @Garbage
   const tempTribes = new Set<TribeData>();
   const numTribes = reader.readNumber();
   for (let i = 0; i < numTribes; i++) {
      const isExtended = reader.readBoolean();
      reader.padOffset(3);

      const tribe = isExtended ? readExtendedTribeData(reader) : readShortTribeData(reader);
      tempTribes.add(tribe);
      
      if (i === 0) {
         updatePlayerTribe(tribe as ExtendedTribeInfo);
      }
   }
   tribes.splice(0, tribes.length);
   for (const tribe of tempTribes) {
      tribes.push(tribe);
   }

   // Process entities
   const numEntities = reader.readNumber();
   const visibleEntities = [];
   for (let i = 0; i < numEntities; i++) {
      const entityID = reader.readNumber() as Entity;
      visibleEntities.push(entityID);
      if (entityID === playerInstance) {
         if (entityExists(playerInstance)) {
            processPlayerUpdateData(reader);
         } else {
            processEntityCreationData(entityID, reader);
         }
      } else if (entityExists(entityID)) {
         processEntityUpdateData(entityID, reader);
      } else {
         processEntityCreationData(entityID, reader);
      }
   }

   const entitiesToRemove = new Set<Entity>();

   // @Incomplete?
   // @Hack @Speed: remove once carmack networking is in place
   // When changing layers, remove all entities from other layers
   // const newPlayerLayer = getCurrentLayer();
   // if (newPlayerLayer !== startLayer) {
   //    for (let i = 0; i < TransformComponentArray.entities.length; i++) {
   //       const entity = TransformComponentArray.entities[i];
   //       const layer = getEntityLayer(entity);
   //       if (layer !== newPlayerLayer) {
   //          entitiesToRemove.add(entity);
   //       }
   //    }
   // }
   
   // Read removed entity IDs
   const serverRemovedEntityIDs = new Set<number>();
   const numRemovedEntities = reader.readNumber();
   for (let i = 0; i < numRemovedEntities; i++) {
      const entityID = reader.readNumber();

      serverRemovedEntityIDs.add(entityID);
      
      if (entityExists(entityID)) {
         entitiesToRemove.add(entityID);
      }
   }

   // @Cleanup: move to own function
   
   // Remove entities which are no longer visible
   const minVisibleChunkX = Camera.minVisibleChunkX - 2;
   const maxVisibleChunkX = Camera.maxVisibleChunkX + 2;
   const minVisibleChunkY = Camera.minVisibleChunkY - 2;
   const maxVisibleChunkY = Camera.maxVisibleChunkY + 2;
   // @Speed
   for (let chunkX = 0; chunkX < Settings.BOARD_SIZE; chunkX++) {
      for (let chunkY = 0; chunkY < Settings.BOARD_SIZE; chunkY++) {
         // Skip visible chunks
         if (chunkX >= minVisibleChunkX && chunkX <= maxVisibleChunkX && chunkY >= minVisibleChunkY && chunkY <= maxVisibleChunkY) {
            continue;
         }

         const chunk = playerLayer.getChunk(chunkX, chunkY);
         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            // @Hack?
            if (entity !== playerInstance) {
               entitiesToRemove.add(entity);
            }
         }
      }
   }

   for (const entity of entitiesToRemove) {
      const isDeath = serverRemovedEntityIDs.has(entity);
      removeEntity(entity, isDeath);

      if (entity === playerInstance) {
         Client.killPlayer();
      }
   }

   const visibleHits = new Array<HitData>();
   const numHits = reader.readNumber();
   for (let i = 0; i < numHits; i++) {
      const hitEntityID = reader.readNumber();
      const x = reader.readNumber();
      const y = reader.readNumber();
      const attackEffectiveness = reader.readNumber() as AttackEffectiveness;
      const damage = reader.readNumber();
      const shouldShowDamageNumber = reader.readBoolean();
      reader.padOffset(3);
      const flags = reader.readNumber();
      
      const hit: HitData = {
         hitEntityID: hitEntityID,
         hitPosition: [x, y],
         attackEffectiveness: attackEffectiveness,
         damage: damage,
         shouldShowDamageNumber: shouldShowDamageNumber,
         flags: flags
      };
      visibleHits.push(hit);
   }

   const playerKnockbacks = new Array<PlayerKnockbackData>();
   const numPlayerKnockbacks = reader.readNumber();
   for (let i = 0; i < numPlayerKnockbacks; i++) {
      const knockback = reader.readNumber();
      const knockbackDirection = reader.readNumber();
      playerKnockbacks.push({
         knockback: knockback,
         knockbackDirection: knockbackDirection
      });
   }

   const heals = new Array<HealData>();
   const numHeals = reader.readNumber();
   for (let i = 0; i < numHeals; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const healedID = reader.readNumber();
      const healerID = reader.readNumber();
      const healAmount = reader.readNumber();
      heals.push({
         entityPositionX: x,
         entityPositionY: y,
         healedID: healedID,
         healerID: healerID,
         healAmount: healAmount
      });
   }

   const visibleEntityDeathIDs = new Array<Entity>();
   const numVisibleDeaths = reader.readNumber();
   for (let i = 0; i < numVisibleDeaths; i++) {
      const id = reader.readNumber();
      visibleEntityDeathIDs.push(id);
   }

   // Research orb completes
   const numOrbs = reader.readNumber();
   for (let i = 0; i < numOrbs; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const amount = reader.readNumber();
      createResearchNumber(x, y, amount);
   }

   const tileUpdates = new Array<ServerTileUpdateData>();
   const numTileUpdates = reader.readNumber();
   for (let i = 0; i < numTileUpdates; i++) {
      const layerIdx = reader.readNumber();
      const tileIndex = reader.readNumber();
      const tileType = reader.readNumber();

      tileUpdates.push({
         layerIdx: layerIdx,
         tileIndex: tileIndex,
         type: tileType
      });
   }

   // Wall subtile updates
   for (const layer of layers) {
      const numUpdates = reader.readNumber();
      for (let i = 0; i < numUpdates; i++) {
         const subtileIndex = reader.readNumber();
         const subtileType = reader.readNumber() as SubtileType;
         const damageTaken = reader.readNumber();
         layer.registerSubtileUpdate(subtileIndex, subtileType, damageTaken);
      }
   }

   const playerHealth = reader.readNumber();

   const hasDebugData = reader.readBoolean();
   reader.padOffset(3);
   
   if (hasDebugData && isDev()) {
      const debugData = readDebugData(reader);
      Game.setGameObjectDebugData(debugData);
   } else {
      Game.setGameObjectDebugData(null);
   }

   // @Incomplete
   // hasFrostShield: player.immunityTimer === 0 && playerArmour !== null && playerArmour.type === ItemType.deepfrost_armour,

   const hasFrostShield = reader.readBoolean();
   reader.padOffset(3);

   const hasPickedUpItem = reader.readBoolean();
   reader.padOffset(3);

   let hotbarCrossbowLoadProgressRecord: Partial<Record<number, number>> | undefined;
   if (playerInstance !== null) {
      hotbarCrossbowLoadProgressRecord = readCrossbowLoadProgressRecord(reader);
   }

   // Title offer
   const hasTitleOffer = reader.readBoolean();
   reader.padOffset(3);
   let titleOffer: TribesmanTitle | null = null;
   if (hasTitleOffer) {
      titleOffer = reader.readNumber();
   }
   
   // Tick events
   const tickEvents = new Array<EntityTickEvent>();
   const numTickEvents = reader.readNumber();
   for (let i = 0; i < numTickEvents; i++) {
      const entityID = reader.readNumber()
      const type = reader.readNumber() as EntityTickEventType;
      const data = reader.readNumber();
      tickEvents.push({
         entityID: entityID,
         type: type,
         data: data
      });
   }

   // Mined subtiles
   const minedSubtiles = new Array<MinedSubtile>();
   const numMinedSubtiles = reader.readNumber();
   for (let i = 0; i < numMinedSubtiles; i++) {
      const subtile = reader.readNumber();
      const subtileType = reader.readNumber() as SubtileType;
      const support = reader.readNumber();
      const isCollapsing = reader.readBoolean();
      reader.padOffset(3);

      const minedSubtile: MinedSubtile = {
         subtileIndex: subtile,
         subtileType: subtileType,
         support: support,
         isCollapsing: isCollapsing
      };
      minedSubtiles.push(minedSubtile);
   }
   setMinedSubtiles(minedSubtiles);

   // Collapses
   const numCollapses = reader.readNumber();
   for (let i = 0; i < numCollapses; i++) {
      const collapsingSubtileIndex = reader.readNumber();
      const ageTicks = reader.readNumber();
      tickCollapse(collapsingSubtileIndex, ageTicks);
   }

   updateGrassBlockers(reader);

   // Tribe plans and virtual buildings
   // @Cleanup: remove underscore
   const _isDev = reader.readBoolean();
   reader.padOffset(3);
   if (_isDev) {
      readPacketDevData(reader);
   }
   
   // @Garbage
   const gameDataPacket: GameDataPacket = {
      tileUpdates: tileUpdates,
      visibleHits: visibleHits,
      playerKnockbacks: playerKnockbacks,
      heals: heals,
      playerHealth: playerHealth,
      hasFrostShield: hasFrostShield,
      pickedUpItem: hasPickedUpItem,
      hotbarCrossbowLoadProgressRecord: hotbarCrossbowLoadProgressRecord,
      titleOffer: titleOffer,
      tickEvents: tickEvents,
      // @Incomplete
      visibleBuildingPlans: [],
      visibleRestrictedBuildingAreas: [],
      visibleWalls: [],
      visibleWallConnections: [],
      visibleEntityDeathIDs: []
   };

   // @Cleanup: remove
   Client.processGameDataPacket(gameDataPacket);
}

export function processSyncDataPacket(reader: PacketReader): void {
   if (!Game.isRunning || playerInstance === null) return;
   
   const x = reader.readNumber();
   const y = reader.readNumber();
   const rotation = reader.readNumber();

   const selfVelocityX = reader.readNumber();
   const selfVelocityY = reader.readNumber();
   const externalVelocityX = reader.readNumber();
   const externalVelocityY = reader.readNumber();
   const accelerationX = reader.readNumber();
   const accelerationY = reader.readNumber();

   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   
   transformComponent.position.x = x;
   transformComponent.position.y = y;
   transformComponent.rotation = rotation;

   const physicsComponent = PhysicsComponentArray.getComponent(playerInstance);
   transformComponent.selfVelocity.x = selfVelocityX;
   transformComponent.selfVelocity.y = selfVelocityY;
   transformComponent.externalVelocity.x = externalVelocityX;
   transformComponent.externalVelocity.y = externalVelocityY;
   physicsComponent.acceleration.x = accelerationX;
   physicsComponent.acceleration.y = accelerationY;
   
   Game.sync();
}

export function processForcePositionUpdatePacket(reader: PacketReader): void {
   if (playerInstance === null) {
      return;
   }
   
   const x = reader.readNumber();
   const y = reader.readNumber();

   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   transformComponent.position.x = x;
   transformComponent.position.y = y;
}