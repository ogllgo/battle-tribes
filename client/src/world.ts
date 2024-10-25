import { ServerComponentType } from "../../shared/src/components";
import { EntityID, EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import Board from "./Board";
import Chunk from "./Chunk";
import { EntityRenderInfo } from "./EntityRenderInfo";
import { ComponentArray, EntityConfig, getClientComponentArray, getComponentArrays, getServerComponentArray } from "./entity-components/ComponentArray";
import { ServerComponentParams } from "./entity-components/components";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import Layer from "./Layer";
import { removeLightsAttachedToEntity, removeLightsAttachedToRenderPart } from "./lights";
import { thingIsRenderPart } from "./render-parts/render-parts";
import { registerDirtyEntity, removeEntityFromDirtyArray } from "./rendering/render-part-matrices";
import { getEntityRenderLayer } from "./render-layers";
import { ClientComponentType } from "./entity-components/client-component-types";
import { ClientComponentParams, getEntityClientComponentConfigs } from "./entity-components/client-components";

export interface EntityCreationInfo {
   readonly renderInfo: EntityRenderInfo;
}

// Doing it this way by importing the value directly (instead of calling a function to get it) will cause some overhead when accessing it,
// but this is in the client so these optimisations are less important. The ease-of-use is worth it
/** The player entity associated with the current player. If null, then the player is dead */
export let playerInstance: EntityID | null = null;

export const layers = new Array<Layer>();

let currentLayer: Layer;

const entityTypes: Partial<Record<EntityID, EntityType>> = {};
const entitySpawnTicks: Partial<Record<EntityID, number>> = {};
const entityLayers: Partial<Record<EntityID, Layer>> = {};
const entityRenderInfos: Partial<Record<EntityID, EntityRenderInfo>> = {};

export function setPlayerInstance(entity: EntityID | null): void {
   playerInstance = entity;
}

export function addLayer(layer: Layer): void {
   layers.push(layer);
}

export function setCurrentLayer(layerIdx: number): void {
   currentLayer = layers[layerIdx];
}

export function getCurrentLayer(): Layer {
   return currentLayer;
}

export function getEntityAgeTicks(entity: EntityID): number {
   if (typeof entitySpawnTicks[entity] === "undefined") {
      throw new Error();
   }
   return Board.serverTicks - entitySpawnTicks[entity]!;
}

export function getEntityLayer(entity: EntityID): Layer {
   return entityLayers[entity]!;
}

export function getEntityType(entity: EntityID): EntityType {
   const entityType = entityTypes[entity];
   if (typeof entityType === "undefined") {
      throw new Error("Entity '" + entity + "' does not exist");
   }
   return entityType;
}

export function getEntityRenderInfo(entity: EntityID): EntityRenderInfo {
   return entityRenderInfos[entity]!;
}

export function entityExists(entity: EntityID): boolean {
   return typeof entityLayers[entity] !== "undefined";
}

export function registerBasicEntityInfo(entity: EntityID, entityType: EntityType, spawnTicks: number, layer: Layer, renderInfo: EntityRenderInfo): void {
   entityTypes[entity] = entityType;
   entitySpawnTicks[entity] = spawnTicks;
   entityLayers[entity] = layer;
   entityRenderInfos[entity] = renderInfo;
}

// @Cleanup: location
export type EntityServerComponentParams = Partial<{
   [T in ServerComponentType]: ServerComponentParams<T>;
}>;
export type ClientServerComponentParams = Partial<{
   [T in ClientComponentType]: ClientComponentParams<T>;
}>;

// @Cleanup: location
// @Cleanup: perhaps 2 of these properties can be combined into a map? instead of record + array
export interface EntityPreCreationInfo {
   readonly serverComponentTypes: ReadonlyArray<ServerComponentType>;
   readonly serverComponentParams: EntityServerComponentParams;
}

/** Creates and populates all the things which make up an entity and returns them. It is then up to the caller as for what to do with these things */
export function createEntity(entity: EntityID, entityType: EntityType, layer: Layer, preCreationInfo: EntityPreCreationInfo): EntityCreationInfo {
   const renderLayer = getEntityRenderLayer(entityType, preCreationInfo);
   const renderInfo = new EntityRenderInfo(entity, renderLayer);
   
   // Create entity config
   const entityConfig: EntityConfig<never, never> = {
      entity: entity,
      entityType: entityType,
      layer: layer,
      renderInfo: renderInfo,
      serverComponents: preCreationInfo.serverComponentParams,
      // @Cleanup: Should this instead be extracted into pre-creation info?
      clientComponents: getEntityClientComponentConfigs(entityType)
   };

   // Get whichever client and server components the entity has
   const componentArrays = new Array<ComponentArray>();
   // @Hack @Garbage
   for (const serverComponentType of Object.keys(entityConfig.serverComponents).map(Number)) {
      const componentArray = getServerComponentArray(serverComponentType);
      componentArrays.push(componentArray);
   }
   // @Hack @Garbage
   for (const clientComponentType of Object.keys(entityConfig.clientComponents).map(Number)) {
      const componentArray = getClientComponentArray(clientComponentType);
      componentArrays.push(componentArray);
   }

   /** Stores the render parts based on their ID so that components can later access them */
   const renderPartsRecord: Partial<Record<number, object>> = {};

   // Create render parts
   for (const componentArray of componentArrays) {
      if (typeof componentArray.createRenderParts !== "undefined") {
         const renderParts = componentArray.createRenderParts(renderInfo, entityConfig);
         renderPartsRecord[componentArray.id] = renderParts;
      }
   }

   // Create components
   for (const componentArray of componentArrays) {
      const renderParts = renderPartsRecord[componentArray.id]!;
      const component = componentArray.createComponent(entityConfig, renderParts);
      
      // @Incomplete: don't always add
      componentArray.addComponent(entity, component);

      // @Cleanup: unneeded
      // if (isPlayer) {
      //    if (typeof componentArray.updatePlayerFromData !== "undefined") {
      //       componentArray.updatePlayerFromData(reader, true);
      //    } else {
      //       componentArray.padData(reader);
      //    }
      // }
   }
   
   // @Temporary? @Cleanup: should be done using the dirty function probs
   registerDirtyEntity(entity);

   return {
      renderInfo: renderInfo
   };
}

export function removeEntity(entity: EntityID, isDeath: boolean): void {
   const renderInfo = getEntityRenderInfo(entity);
   
   const layer = getEntityLayer(entity);
   layer.removeEntityFromRendering(entity, renderInfo.renderLayer);

   if (isDeath) {
      // Call onDie functions
      // @Speed
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (typeof componentArray.onDie !== "undefined" && componentArray.hasComponent(entity)) {
            componentArray.onDie(entity);
         }
      }
   }
   
   removeEntityFromDirtyArray(entity);

   // Remove any attached lights
   removeLightsAttachedToEntity(entity);

   for (let i = 0; i < renderInfo.allRenderThings.length; i++) {
      const renderPart = renderInfo.allRenderThings[i];
      if (thingIsRenderPart(renderPart)) {
         removeLightsAttachedToRenderPart(renderPart.id);
      }
   }

   const componentArrays = getComponentArrays();

   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (typeof componentArray.onRemove !== "undefined" && componentArray.hasComponent(entity)) {
         componentArray.onRemove(entity);
      }
   }

   // Remove from component arrays
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (componentArray.hasComponent(entity)) {
         componentArray.removeComponent(entity);
      }
   }

   delete entityTypes[entity];
   delete entitySpawnTicks[entity];
   delete entityLayers[entity];
   delete entityRenderInfos[entity];
}

export function changeEntityLayer(entity: EntityID, newLayer: Layer): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const previousLayer = getEntityLayer(entity);

   const renderInfo = getEntityRenderInfo(entity);

   previousLayer.removeEntityFromRendering(entity, renderInfo.renderLayer);
   newLayer.addEntityToRendering(entity, renderInfo.renderLayer, renderInfo.renderHeight);

   // Remove from all previous chunks and add to new ones
   const newChunks = new Set<Chunk>();
   const minChunkX = Math.max(Math.floor(transformComponent.boundingAreaMinX / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor(transformComponent.boundingAreaMaxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor(transformComponent.boundingAreaMinY / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor(transformComponent.boundingAreaMaxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = previousLayer.getChunk(chunkX, chunkY);

         if (transformComponent.chunks.has(chunk)) {
            chunk.removeEntity(entity);
            transformComponent.chunks.delete(chunk);

            const newChunk = newLayer.getChunk(chunkX, chunkY);
            newChunk.addEntity(entity);
            newChunks.add(newChunk);
         }
      }
   }
   transformComponent.chunks.clear();
   for (const chunk of newChunks) {
      transformComponent.chunks.add(chunk);
   }

   entityLayers[entity] = newLayer;
}