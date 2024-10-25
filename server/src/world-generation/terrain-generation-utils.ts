import { SubtileType } from "battletribes-shared/tiles";
import { getSubtileIndex } from "../../../shared/src/subtiles";

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