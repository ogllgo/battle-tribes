import { SubtileType, TileType } from "battletribes-shared/tiles";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { Biome } from "../../../shared/src/biomes";
import { TileIndex } from "../../../shared/src/utils";
import Layer, { getTileIndexIncludingEdges, getTileX, getTileY, tileIsInWorld } from "../Layer";
import { Settings } from "../../../shared/src/settings";

export interface LocalBiome {
   readonly biome: Biome;
   readonly layer: Layer;
   readonly tiles: ReadonlyArray<TileIndex>;
   /** All tiles which aren't outside the border */
   readonly tilesInBorder: ReadonlyArray<TileIndex>;
   /** Stores how many tiles of each type there are in the local chunk */
   readonly tileCensus: Partial<Record<TileType, number>>;
   // @Incomplete: This would be more accurate if we stored the index of the tile in the tiles array with the smallest average distance from the other tiles.
   //   e.g. think about a crescent shaped local biome, if we use the center pos then that won't even be in the biome!
   // The following 2 variables store the average position of the biome
   centerX: number;
   centerY: number;
}

// @Cleanup: location? should these be in the layer file as it might be used outside of terrain generation (during the game loop)?

export function setWallInSubtiles(subtileTypes: Float32Array, tileX: number, tileY: number, subtileType: SubtileType): void {
   const startSubtileX = tileX * 4;
   const startSubtileY = tileY * 4;
   
   for (let subtileX = startSubtileX; subtileX < startSubtileX + 4; subtileX++) {
      for (let subtileY = startSubtileY; subtileY < startSubtileY + 4; subtileY++) {
         const idx = getSubtileIndex(subtileX, subtileY);
         subtileTypes[idx] = subtileType;
      }
   }
}

export function tileHasWallSubtile(subtileTypes: Float32Array, tileX: number, tileY: number): boolean {
   const startSubtileX = tileX * 4;
   const startSubtileY = tileY * 4;
   
   for (let subtileX = startSubtileX; subtileX < startSubtileX + 4; subtileX++) {
      for (let subtileY = startSubtileY; subtileY < startSubtileY + 4; subtileY++) {
         const idx = getSubtileIndex(subtileX, subtileY);
         if (subtileTypes[idx] !== SubtileType.none) {
            return true;
         }
      }
   }

   return false;
}

const getConnectedBiomeTiles = (tileBiomes: Readonly<Float32Array>, processedTiles: Set<TileIndex>, tileX: number, tileY: number): ReadonlyArray<TileIndex> => {
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   const targetBiome = tileBiomes[tileIndex];

   processedTiles.add(tileIndex);
   
   /** Tiles to expand from, not tiles to check whether they belong in connectedTiles */
   const tilesToCheck = [tileIndex];
   const connectedTiles = [tileIndex];
   while (tilesToCheck.length > 0) {
      const currentTile = tilesToCheck.shift()!;
      const currentTileX = getTileX(currentTile);
      const currentTileY = getTileY(currentTile);

      // Top
      if (currentTileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE - 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX, currentTileY + 1);
         if (!processedTiles.has(tileIndex)) {
            const biome = tileBiomes[tileIndex];
            if (biome === targetBiome) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
      // Right
      if (currentTileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE - 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX + 1, currentTileY);
         if (!processedTiles.has(tileIndex)) {
            const biome = tileBiomes[tileIndex];
            if (biome === targetBiome) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
      // Bottom
      if (currentTileY > -Settings.EDGE_GENERATION_DISTANCE + 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX, currentTileY - 1);
         if (!processedTiles.has(tileIndex)) {
            const biome = tileBiomes[tileIndex];
            if (biome === targetBiome) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
      // Left
      if (currentTileX > -Settings.EDGE_GENERATION_DISTANCE + 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX - 1, currentTileY);
         if (!processedTiles.has(tileIndex)) {
            const biome = tileBiomes[tileIndex];
            if (biome === targetBiome) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
   }

   return connectedTiles;
}

/** Must be called for each layer */
export function groupLocalBiomes(layer: Layer): void {
   const tileBiomes = layer.tileBiomes;
   
   const processedTiles = new Set<TileIndex>();
   
   for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
      for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (processedTiles.has(tileIndex)) {
            continue;
         }

         // New tile! Make a local biome out of it
         const connectedTiles = getConnectedBiomeTiles(tileBiomes, processedTiles, tileX, tileY);

         let totalTileX = 0;
         let totalTileY = 0;
         for (const tile of connectedTiles) {
            totalTileX += getTileX(tile);
            totalTileY += getTileY(tile);
         }
         const centerX = totalTileX * Settings.TILE_SIZE / connectedTiles.length + Settings.TILE_SIZE * 0.5;
         const centerY = totalTileY * Settings.TILE_SIZE / connectedTiles.length + Settings.TILE_SIZE * 0.5;

         const tileCensus: Partial<Record<TileType, number>> = {};
         for (const tile of connectedTiles) {
            const tileType = layer.getTileType(tile);
            if (typeof tileCensus[tileType] === "undefined") {
               tileCensus[tileType] = 1;
            } else {
               // @Hack: '!'
               tileCensus[tileType]!++;
            }
         }
         
         const localBiome: LocalBiome = {
            biome: tileBiomes[tileIndex],
            layer: layer,
            tiles: connectedTiles,
            tilesInBorder: connectedTiles.filter(tileIndex => tileIsInWorld(getTileX(tileIndex), getTileY(tileIndex))),
            tileCensus: tileCensus,
            centerX: centerX,
            centerY: centerY
         };
         layer.localBiomes.push(localBiome);
      }
   }
}