import { Settings } from "./settings";

export function getSubtileIndex(subtileX: number, subtileY: number): number {
   return (subtileY + Settings.EDGE_GENERATION_DISTANCE * 4) * Settings.FULL_BOARD_DIMENSIONS * 4 + subtileX + Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function getSubtileX(subtileIndex: number): number {
   return subtileIndex % (Settings.FULL_BOARD_DIMENSIONS * 4) - Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function getSubtileY(subtileIndex: number): number {
   return Math.floor(subtileIndex / (Settings.FULL_BOARD_DIMENSIONS * 4)) - Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function subtileIsInWorld(subtileX: number, subtileY: number): boolean {
   return subtileX >= -Settings.EDGE_GENERATION_DISTANCE * 4 && subtileX < (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 && subtileY >= -Settings.EDGE_GENERATION_DISTANCE * 4 && subtileY < (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4;
}