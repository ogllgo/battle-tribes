import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { tickTribes } from "./ai-tribe-building/ai-building";
import Layer from "./Layer";
import { removeEntityFromCensus } from "./census";
import { ComponentArrays, getComponentArrayRecord } from "./components/ComponentArray";
import { registerEntityRemoval } from "./server/player-clients";
import Tribe from "./Tribe";
import { TerrainGenerationInfo } from "./world-generation/surface-terrain-generation";
import Chunk from "./Chunk";
import { TransformComponentArray } from "./components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";

const enum Vars {
   START_TIME = 6
}

export const enum LayerType {
   surface,
   underground
}

interface EntityJoinInfo {
   readonly id: number;
   readonly entityType: EntityType;
   readonly layer: Layer;
   readonly entityComponentTypes: ReadonlyArray<ServerComponentType>;
   /** Number of ticks remaining until the entity will be added. */
   ticksRemaining: number;
}

export let surfaceLayer: Layer;
export let undergroundLayer: Layer;
export const layers = new Array<Layer>();

let ticks = 0;
/** The time of day the server is currently in. Interval: [0, 24) */
let time = Vars.START_TIME;

const entityTypes: Partial<Record<Entity, EntityType>> = {};
const entityLayers: Partial<Record<Entity, Layer>> = {};
const entitySpawnTicks: Partial<Record<Entity, number>> = {};
const entityComponentTypes: Partial<Record<Entity, ReadonlyArray<ServerComponentType>>> = {};

const tribes = new Array<Tribe>();

// Array of join infos, sorted by the ticks remaining until they join.
const entityJoinBuffer = new Array<EntityJoinInfo>();
const entityRemoveBuffer = new Array<Entity>();

export function createLayers(surfaceTerrainGenerationInfo: TerrainGenerationInfo, undergroundTerrainGenerationInfo: TerrainGenerationInfo): void {
   surfaceLayer = new Layer(surfaceTerrainGenerationInfo);
   layers.push(surfaceLayer);
   undergroundLayer = new Layer(undergroundTerrainGenerationInfo);
   layers.push(undergroundLayer);
}

export function getLayerByType(type: LayerType): Layer {
   return type === LayerType.surface ? surfaceLayer : undergroundLayer;
}

export function getGameTicks(): number {
   return ticks;
}

export function getGameTime(): number {
   return time;
}

/* ----------- */
/* TRIBE STUFF */
/* ----------- */

export function addTribe(tribe: Tribe): void {
   tribes.push(tribe);
}

export function removeTribe(tribe: Tribe): void {
   const idx = tribes.indexOf(tribe);
   if (idx !== -1) {
      tribes.splice(idx, 1);
   }
}

export function updateTribes(): void {
   // @Cleanup: why do we have two different ones??
   
   for (const tribe of tribes) {
      tribe.tick();
   }
   // @Cleanup: Maybe move to server tick function
   tickTribes();
}

export function getTribes(): ReadonlyArray<Tribe> {
   return tribes;
}

export function getTribe(tribeID: number): Tribe {
   for (let i = 0; i < tribes.length; i++) {
      const tribe = tribes[i];
      if (tribe.id === tribeID) {
         return tribe;
      }
   }

   throw new Error("Couldn't find a tribe with ID " + tribeID);
}

export function isNight(): boolean {
   return time < 6 || time >= 18;
}

export function tickGameTime(): void {
   ticks++;
   time += Settings.TIME_PASS_RATE / Settings.TPS / 3600;
   if (time >= 24) {
      time -= 24;
   }
}

export function getEntityType(entity: Entity): EntityType | undefined {
   return entityTypes[entity];
}

/** Cleanup: obscure, only used in 1 situation. Rework so we can remove this */
export function validateEntity(entity: Entity): Entity | 0 {
   return typeof entityTypes[entity] !== "undefined" ? entity : 0;
}

export function entityExists(entity: Entity): boolean {
   return typeof entityTypes[entity] !== "undefined";
}

export function getEntityLayer(entity: Entity): Layer {
   const layer = entityLayers[entity];
   if (typeof layer === "undefined") {
      throw new Error("Entity doesn't exist!");
   }
   return layer;
}

export function getEntityAgeTicks(entity: Entity): number {
   if (typeof entitySpawnTicks[entity] === "undefined") {
      throw new Error();
   }
   return ticks - entitySpawnTicks[entity]!;
}

export function getEntitySpawnTicks(entity: Entity): number {
   const spawnTicks = entitySpawnTicks[entity];
   if (typeof spawnTicks === "undefined") {
      throw new Error("Entity doesn't exist!");
   }
   return spawnTicks;
}

export function getEntityComponentTypes(entity: Entity): ReadonlyArray<ServerComponentType> {
   return entityComponentTypes[entity]!;
}

export function pushJoinBuffer(shouldTickJoinInfos: boolean): void {
   // Push entities
   let finalPushedIdx: number | undefined;
   for (let i = 0; i < entityJoinBuffer.length; i++) {
      const joinInfo = entityJoinBuffer[i];
      if (joinInfo.ticksRemaining === 0) {
         entityTypes[joinInfo.id] = joinInfo.entityType;
         entityLayers[joinInfo.id] = joinInfo.layer;
         entityComponentTypes[joinInfo.id] = joinInfo.entityComponentTypes;
         entitySpawnTicks[joinInfo.id] = ticks;
         finalPushedIdx = i;
      } else if (shouldTickJoinInfos) {
         joinInfo.ticksRemaining--;
      }
   }

   if (typeof finalPushedIdx !== "undefined") {
      // Clear pushed entities from queue
      const numPushedEntities = finalPushedIdx + 1;
      entityJoinBuffer.splice(0, numPushedEntities);
   }
   
   
   // Push components
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];
      componentArray.pushComponentsFromBuffer();
   }

   // Once all new components are added, call on join functions and clear buffers
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];

      // @Cleanup: should probably do all of this in one function in the component array, including the clearing

      const onJoin = componentArray.onJoin;
      if (typeof onJoin !== "undefined") {
         const componentBufferIDs = componentArray.getComponentBufferIDs();

         for (let j = 0; j < componentBufferIDs.length; j++) {
            const ticksRemaining = componentArray.bufferedComponentJoinTicksRemaining[j];
            if (ticksRemaining > 0) {
               break;
            }
            const entityID = componentBufferIDs[j];
            onJoin(entityID);
         }
      }

      componentArray.clearJoinedComponents(shouldTickJoinInfos);
   }
}

/** Removes game objects flagged for deletion */
export function destroyFlaggedEntities(): void {
   for (const entity of entityRemoveBuffer) {
      registerEntityRemoval(entity);

      // @Speed: don't do per entity, do per component array
      // Call remove functions
      for (let i = 0; i < ComponentArrays.length; i++) {
         const componentArray = ComponentArrays[i];
         if (componentArray.hasComponent(entity) && typeof componentArray.onRemove !== "undefined") {
            componentArray.onRemove(entity);
         }
      }

      // @Speed: don't do per entity, do per component array
      // Remove components
      for (let i = 0; i < ComponentArrays.length; i++) {
         const componentArray = ComponentArrays[i];
         if (componentArray.hasComponent(entity)) {
            componentArray.removeComponent(entity);
         }
      }

      removeEntityFromCensus(entity);

      delete entityTypes[entity];
      delete entityLayers[entity];
      delete entitySpawnTicks[entity];
      delete entityComponentTypes[entity];
   }

   entityRemoveBuffer.length = 0;
}

export function entityIsFlaggedForDestruction(entity: Entity): boolean {
   return entityRemoveBuffer.indexOf(entity) !== -1;
}

export function destroyEntity(entity: Entity): void {
   // @Temporary
   const entityType = getEntityType(entity);
   if (typeof entityType === "undefined") {
      throw new Error("Tried to remove an entity before it was added to the board.");
   }
   
   // Don't try to remove if already being/is removed
   if (entityIsFlaggedForDestruction(entity) || !entityExists(entity)) {
      return;
   }

   // Add the entity to the remove buffer
   entityRemoveBuffer.push(entity);
   // Remove the entity from the join buffer
   for (let i = 0; i < entityJoinBuffer.length; i++) {
      const joinInfo = entityJoinBuffer[i];

      if (joinInfo.id === entity) {
         entityJoinBuffer.splice(i, 1);
         break;
      }
   }

   // Call any preRemove functions
   const componentTypes = getEntityComponentTypes(entity);
   const componentArrayRecord = getComponentArrayRecord();
   for (const componentType of componentTypes) {
      const componentArray = componentArrayRecord[componentType];
      if (typeof componentArray.preRemove !== "undefined") {
         componentArray.preRemove(entity);
      }
   }
}

export function addEntityToJoinBuffer(entity: Entity, entityType: EntityType, layer: Layer, entityComponentTypes: ReadonlyArray<ServerComponentType>, joinDelayTicks: number): void {
   // Find a spot for the entity
   
   const joinInfo: EntityJoinInfo = {
      id: entity,
      entityType: entityType,
      layer: layer,
      entityComponentTypes: entityComponentTypes,
      ticksRemaining: joinDelayTicks
   };

   // @Speed
   // Find a spot for the entity
   let insertIdx = entityJoinBuffer.length;
   for (let i = 0; i < entityJoinBuffer.length; i++) {
      if (entityJoinBuffer[i].ticksRemaining > joinDelayTicks) {
         insertIdx = i;
         break;
      }
   }
   entityJoinBuffer.splice(insertIdx, 0, joinInfo);
}

export function tickEntities(): void {
   const gameTicks = getGameTicks();
   for (const componentArray of ComponentArrays) {
      if (typeof componentArray.onTick !== "undefined" && gameTicks % componentArray.onTick.tickInterval === 0) {
         const func = componentArray.onTick.func;
         for (let i = 0; i < componentArray.activeEntities.length; i++) {
            const entity = componentArray.activeEntities[i];
            func(entity);
         }
      }

      componentArray.deactivateQueue();
   }
}

export function changeEntityLayer(entity: Entity, newLayer: Layer): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const previousLayer = getEntityLayer(entity);

   // Remove from all previous chunks and add to new ones
   const newChunks = new Array<Chunk>();
   const minChunkX = Math.max(Math.floor(transformComponent.boundingAreaMinX / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor(transformComponent.boundingAreaMaxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor(transformComponent.boundingAreaMinY / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor(transformComponent.boundingAreaMaxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = previousLayer.getChunk(chunkX, chunkY);
         const idx = transformComponent.chunks.indexOf(chunk);
         if (idx !== -1) {
            transformComponent.removeFromChunk(entity, previousLayer, chunk);
            transformComponent.chunks.splice(idx, 1);

            const newChunk = newLayer.getChunk(chunkX, chunkY);
            transformComponent.addToChunk(entity, newLayer, newChunk);
            newChunks.push(newChunk);
         }
      }
   }
   transformComponent.chunks = newChunks;

   entityLayers[entity] = newLayer;
}