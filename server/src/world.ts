import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import Layer from "./Layer";
import { removeEntityFromCensus, runTileCensuses } from "./census";
import { ComponentArrays, getComponentArrayRecord } from "./components/ComponentArray";
import { registerEntityDestruction } from "./server/player-clients";
import Tribe from "./Tribe";
import { ServerComponentType } from "battletribes-shared/components";
import { assert } from "../../shared/src/utils";
import { addLayerBuildingBlockingTiles, layers, surfaceLayer, undergroundLayer } from "./layers";
import OPTIONS from "./options";
import { tileHasWallSubtile } from "./world-generation/terrain-generation-utils";
import { markWallTileInPathfinding } from "./pathfinding";
import { generateSurfaceTerrain } from "./world-generation/surface-layer-generation";
import { generateUndergroundTerrain } from "./world-generation/underground-layer-generation";
import { EntityConfig } from "./components";
import { attachLightToHitbox } from "./light-levels";
import { attachEntity } from "./components/TransformComponent";

const enum Vars {
   START_TIME = 6
}

interface EntityJoinInfo {
   readonly entity: Entity;
   readonly entityConfig: EntityConfig;
   readonly layer: Layer;
   readonly entityComponentTypes: ReadonlyArray<ServerComponentType>;
   /** Number of ticks remaining until the entity will be added. */
   ticksRemaining: number;
}

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

// @Cleanup: this should probs be in the layers file
export function generateLayers(): void {
   generateSurfaceTerrain(surfaceLayer);
   generateUndergroundTerrain(surfaceLayer, undergroundLayer);

   runTileCensuses();

   // @Cleanup: make into function
   for (const layer of layers) {
      // @Incomplete: investigate whether generate walls mode actually does anything
      // This check isn't strictly necessary but it improves speed
      if (OPTIONS.generateWalls) {
         for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
            for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
               if (tileHasWallSubtile(layer.wallSubtileTypes, tileX, tileY)) {
                  // Mark which chunks have wall tiles
                  const chunkX = Math.floor(tileX / Settings.CHUNK_SIZE);
                  const chunkY = Math.floor(tileY / Settings.CHUNK_SIZE);
                  const chunk = layer.getChunk(chunkX, chunkY);
                  chunk.hasWallTiles = true;
                  
                  // @Incomplete: This system is outdated! Should account for wall subtiles
                  // Mark inaccessible pathfinding nodes
                  markWallTileInPathfinding(layer, tileX, tileY);
               }
            }
         }
      }

      addLayerBuildingBlockingTiles(layer);
   }
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

export function getTribes(): ReadonlyArray<Tribe> {
   return tribes;
}

export function getTribe(tribeID: number): Tribe | null {
   for (let i = 0; i < tribes.length; i++) {``
      const tribe = tribes[i];
      if (tribe.id === tribeID) {
         return tribe;
      }
   }

   return null;
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

export function getEntityType(entity: Entity): EntityType {
   const entityType = entityTypes[entity];
   assert(typeof entityType !== "undefined");
   return entityType;
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

export function setEntityLayer(entity: Entity, layer: Layer): void {
   entityLayers[entity] = layer;
}

export function pushJoinBuffer(shouldTickJoinInfos: boolean): void {
   // Push entities
   let finalPushedIdx: number | undefined;
   for (let i = 0; i < entityJoinBuffer.length; i++) {
      const joinInfo = entityJoinBuffer[i];
      if (joinInfo.ticksRemaining === 0) {
         entityTypes[joinInfo.entity] = joinInfo.entityConfig.entityType;
         entityLayers[joinInfo.entity] = joinInfo.layer;
         entityComponentTypes[joinInfo.entity] = joinInfo.entityComponentTypes;
         entitySpawnTicks[joinInfo.entity] = ticks;

         // Add lights
         for (const lightCreationInfo of joinInfo.entityConfig.lights) {
            attachLightToHitbox(lightCreationInfo.light, lightCreationInfo.attachedHitbox, joinInfo.entity);
         }

         finalPushedIdx = i;
      } else if (shouldTickJoinInfos) {
         joinInfo.ticksRemaining--;
      }
   }
   
   const componentArrayFinalJoiningIndexes = {} as Record<ServerComponentType, number | null>;
   
   // Push components
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];
      componentArray.pushComponentsFromBuffer();

      const finalJoiningIdx = componentArray.getFinalJoiningBufferIdx();
      componentArrayFinalJoiningIndexes[componentArray.componentType] = finalJoiningIdx;
      
      if (shouldTickJoinInfos) {
         componentArray.tickJoinInfos(finalJoiningIdx);
      }
   }

   // Do this before the onJoin function so that child configs get registered to the parent transformComponetns in time for the onJoin functions
   if (typeof finalPushedIdx !== "undefined") {
      // Check if there are any entities which are immediately being carried or have children
      for (let i = 0; i <= finalPushedIdx; i++) {
         const joinInfo = entityJoinBuffer[i];

         const attachInfo = joinInfo.entityConfig.attachInfo;
         if (typeof attachInfo !== "undefined") {
            attachEntity(joinInfo.entity, attachInfo.parent, attachInfo.parentHitbox, attachInfo.destroyWhenParentIsDestroyed);
         }

         const childConfigs = joinInfo.entityConfig.childConfigs;
         if (typeof childConfigs !== "undefined") {
            for (const childConfig of childConfigs) {
               // Find the join info for the child
               // @Speed !
               let childJoinInfo: EntityJoinInfo | undefined;
               for (let j = 0; j <= finalPushedIdx; j++) {
                  const currentJoinInfo = entityJoinBuffer[j];
                  if (currentJoinInfo.entityConfig === childConfig) {
                     childJoinInfo = currentJoinInfo
                     break;
                  }
               }
               assert(typeof childJoinInfo !== "undefined");
               
               attachEntity(childJoinInfo.entity, joinInfo.entity, null, true);
            }
         }
      }

      // Clear pushed entities from queue
      const numPushedEntities = finalPushedIdx + 1;
      entityJoinBuffer.splice(0, numPushedEntities);
   }

   // Once all new components are added, call on join functions and clear buffers
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];

      // NOTE: For this to function correctly, a component should never be inserted at
      // or before the final joining idx by an onJoin function.

      const finalJoiningIdx = componentArrayFinalJoiningIndexes[componentArray.componentType];
      
      const onJoin = componentArray.onJoin;
      if (typeof onJoin !== "undefined" && finalJoiningIdx !== null) {
         const componentBufferIDs = componentArray.getComponentBufferIDs();

         for (let j = 0; j <= finalJoiningIdx; j++) {
            const entityID = componentBufferIDs[j];
            onJoin(entityID);
         }
      }

      componentArray.clearJoinedComponents(finalJoiningIdx);
   }
}

export function preDestroyFlaggedEntities(): void {
   for (const entity of entityRemoveBuffer) {
      registerEntityDestruction(entity);
   }
}

/** Removes game objects flagged for deletion */
export function destroyFlaggedEntities(): void {
   for (const entity of entityRemoveBuffer) {
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
   // @Speed ?
   for (let i = 0; i < entityJoinBuffer.length; i++) {
      const joinInfo = entityJoinBuffer[i];

      if (joinInfo.entity === entity) {
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

export function addEntityToJoinBuffer(entity: Entity, entityConfig: EntityConfig, layer: Layer, entityComponentTypes: ReadonlyArray<ServerComponentType>, joinDelayTicks: number): void {
   // Find a spot for the entity
   
   const joinInfo: EntityJoinInfo = {
      entity: entity,
      entityConfig: entityConfig,
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

export function tickIntervalHasPassed(intervalSeconds: number): boolean {
   const ticksPerInterval = intervalSeconds * Settings.TPS;
   
   const gameTicks = getGameTicks();
   const previousCheck = (gameTicks - 1) / ticksPerInterval;
   const check = gameTicks / ticksPerInterval;
   return Math.floor(previousCheck) !== Math.floor(check);
}