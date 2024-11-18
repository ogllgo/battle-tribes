import { ServerComponentType } from "../../shared/src/components";
import { Entity, EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import Board from "./Board";
import Chunk from "./Chunk";
import { EntityRenderInfo } from "./EntityRenderInfo";
import { ComponentArray, EntityConfig, getClientComponentArray, getComponentArrays, getServerComponentArray } from "./entity-components/ComponentArray";
import { ServerComponentParams } from "./entity-components/components";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import Layer from "./Layer";
import { removeLightsAttachedToEntity, removeLightsAttachedToRenderPart } from "./lights";
import { registerDirtyRenderInfo, removeEntityFromDirtyArrays } from "./rendering/render-part-matrices";
import { getEntityRenderLayer } from "./render-layers";
import { ClientComponentType } from "./entity-components/client-component-types";
import { ClientComponentParams, getEntityClientComponentConfigs } from "./entity-components/client-components";
import { removeEntitySounds } from "./sound";

export interface EntityCreationInfo {
   readonly renderInfo: EntityRenderInfo;
}

// Doing it this way by importing the value directly (instead of calling a function to get it) will cause some overhead when accessing it,
// but this is in the client so these optimisations are less important. The ease-of-use is worth it
/** The player entity associated with the current player. If null, then the player is dead */
export let playerInstance: Entity | null = null;

export const layers = new Array<Layer>();

export let surfaceLayer: Layer;
export let undergroundLayer: Layer;
let currentLayer: Layer;

const entityTypes: Partial<Record<Entity, EntityType>> = {};
const entitySpawnTicks: Partial<Record<Entity, number>> = {};
const entityLayers: Partial<Record<Entity, Layer>> = {};
const entityRenderInfos: Partial<Record<Entity, EntityRenderInfo>> = {};

export function setPlayerInstance(entity: Entity | null): void {
   playerInstance = entity;
}

export function addLayer(layer: Layer): void {
   if (layers.length === 0) {
      surfaceLayer = layer;
   } else {
      undergroundLayer = layer;
   }
   
   layers.push(layer);
}

export function setCurrentLayer(layerIdx: number): void {
   currentLayer = layers[layerIdx];
}

export function getCurrentLayer(): Layer {
   return currentLayer;
}

export function getEntityAgeTicks(entity: Entity): number {
   if (typeof entitySpawnTicks[entity] === "undefined") {
      throw new Error();
   }
   return Board.serverTicks - entitySpawnTicks[entity]!;
}

export function getEntityLayer(entity: Entity): Layer {
   return entityLayers[entity]!;
}

export function getEntityType(entity: Entity): EntityType {
   const entityType = entityTypes[entity];
   if (typeof entityType === "undefined") {
      throw new Error("Entity '" + entity + "' does not exist");
   }
   return entityType;
}

export function getEntityRenderInfo(entity: Entity): EntityRenderInfo {
   return entityRenderInfos[entity]!;
}

export function entityExists(entity: Entity): boolean {
   return typeof entityLayers[entity] !== "undefined";
}

export function registerBasicEntityInfo(entity: Entity, entityType: EntityType, spawnTicks: number, layer: Layer, renderInfo: EntityRenderInfo): void {
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
export function createEntity(entity: Entity, entityType: EntityType, layer: Layer, preCreationInfo: EntityPreCreationInfo): EntityCreationInfo {
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
      
      // @Hack: so that ghost entites don't add components
      if (entity !== 0) {
         componentArray.addComponent(entity, component);
      }

      // @Cleanup: unneeded
      // if (isPlayer) {
      //    if (typeof componentArray.updatePlayerFromData !== "undefined") {
      //       componentArray.updatePlayerFromData(reader, true);
      //    } else {
      //       componentArray.padData(reader);
      //    }
      // }
   }
   
   registerDirtyRenderInfo(renderInfo);

   return {
      renderInfo: renderInfo
   };
}

export function removeEntity(entity: Entity, isDeath: boolean): void {
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
   
   removeEntityFromDirtyArrays(renderInfo);

   // Remove any attached lights
   removeLightsAttachedToEntity(entity);

   removeEntitySounds(entity);

   for (let i = 0; i < renderInfo.allRenderThings.length; i++) {
      const renderPart = renderInfo.allRenderThings[i];
      removeLightsAttachedToRenderPart(renderPart);
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

export function changeEntityLayer(entity: Entity, newLayer: Layer): void {
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