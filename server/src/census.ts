import { Entity, EntityType, NUM_ENTITY_TYPES } from "battletribes-shared/entities";
import { TileType, NUM_TILE_TYPES } from "battletribes-shared/tiles";
import { Biome } from "../../shared/src/biomes";
import Layer from "./Layer";
import { TileIndex } from "battletribes-shared/utils";
import { getEntityType } from "./world";

const entityCounts = new Array<EntityType>();
for (let i = 0; i < NUM_ENTITY_TYPES; i++) {
   entityCounts.push(0);
}

interface TileCensus {
   readonly types: Record<TileType, Array<TileIndex>>;
   biomes: Record<Biome, Array<TileIndex>>;
}

export function createTileCensus(): TileCensus {
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
};

/** Stores the IDs of all entities that are being tracked in the census */
const trackedEntityIDs = new Set<number>();

export function addEntityToCensus(entity: Entity, entityType: EntityType): void {
   entityCounts[entityType]++;
   trackedEntityIDs.add(entity);
}

export function removeEntityFromCensus(entity: Entity): void {
   if (!trackedEntityIDs.has(entity)) return;
   
   const entityType = getEntityType(entity);
   
   if (entityCounts[entityType] <= 0) {
      console.log(entityCounts);
      console.warn(`Entity type "${entityType}" is not in the census.`);
      console.trace();
      throw new Error();
   }

   entityCounts[entityType]--;
   trackedEntityIDs.delete(entity);
}

export function getEntityCount(entityType: EntityType): number {
   return entityCounts[entityType];
}

export function addTileToCensus(layer: Layer, tileIndex: TileIndex): void {
   const tileType = layer.tileTypes[tileIndex] as TileType;
   layer.tileCensus.types[tileType].push(tileIndex);

   const biome = layer.tileBiomes[tileIndex] as Biome;
   layer.tileCensus.biomes[biome].push(tileIndex);
}

export function removeTileFromCensus(layer: Layer, tileIndex: TileIndex): void {
   const tileType = layer.tileTypes[tileIndex] as TileType;
   layer.tileCensus.types[tileType].splice(layer.tileCensus.types[tileType].indexOf(tileIndex), 1);

   const biome = layer.tileBiomes[tileIndex] as Biome;
   layer.tileCensus.biomes[biome].splice(layer.tileCensus.biomes[biome].indexOf(tileIndex), 1);
}

export function getTilesOfType(layer: Layer, tileType: TileType): ReadonlyArray<TileIndex> {
   return layer.tileCensus.types[tileType];
}

export function getTilesOfBiome(layer: Layer, biomeName: Biome): ReadonlyArray<TileIndex> {
   return layer.tileCensus.biomes[biomeName];
}