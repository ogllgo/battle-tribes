import { Settings } from "battletribes-shared/settings";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import CLIENT_SETTINGS from "./client-settings";
import Game, { getCursorWorldPos } from "./game";
import Camera from "./Camera";
import { updateDebugInfoEntity, updateDebugInfoTile } from "./components/game/dev/DebugInfo";
import { isDev } from "./utils";
import { Tile } from "./Tile";
import { updateCursorTooltip } from "./components/game/dev/CursorTooltip";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { getTileIndexIncludingEdges, tileIsInWorld } from "./Layer";
import { getCurrentLayer, getEntityRenderInfo } from "./world";
import { Entity } from "../../shared/src/entities";
import { Point } from "../../shared/src/utils";

export const cursorScreenPos = new Point(0, 0);

export function calculateCursorWorldPositionX(cursorX: number): number | null {
   if (cursorX === null) return null;
   
   const worldX = (cursorX - halfWindowWidth) / Camera.zoom + Camera.position.x;
   if (worldX < 0 || worldX >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE) {
      return null;
   }
   return worldX;
}

export function calculateCursorWorldPositionY(cursorY: number): number | null {
   if (cursorY === null) return null;
   
   const worldY = (-cursorY + halfWindowHeight) / Camera.zoom + Camera.position.y;
   if (worldY < 0 || worldY >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE) {
      return null;
   }
   return worldY;
}

export function handleMouseMovement(e: MouseEvent): void {
   cursorScreenPos.x = e.clientX;
   cursorScreenPos.y = e.clientY;
}

/**
 * Finds the entity the user is hovering over.
 */
export function getMouseTargetTile(): Tile | null {
   const cursorWorldPos = getCursorWorldPos();
   
   const tileX = Math.floor(cursorWorldPos.x / Settings.TILE_SIZE);
   const tileY = Math.floor(cursorWorldPos.y / Settings.TILE_SIZE);

   if (tileIsInWorld(tileX, tileY)) {
      const layer = getCurrentLayer();
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return layer.getTile(tileIndex);
   }
   return null;
}

/**
 * Finds the entity the user is hovering over.
 */
// @Speed
// @Cleanup: Use the highlighted entity system instead of having this custom function
export function getMouseTargetEntity(): Entity | null {
   const cursorWorldPos = getCursorWorldPos();
   const layer = getCurrentLayer();
   
   const minChunkX = Math.max(Math.min(Math.floor((cursorWorldPos.x - CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((cursorWorldPos.x + CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((cursorWorldPos.y - CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((cursorWorldPos.y + CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);

   let closestEntity: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.nonGrassEntities) {
            const transformComponent = TransformComponentArray.getComponent(entity);
            // @Hack
            const hitbox = transformComponent.hitboxes[0];
            
            const distanceFromCursor = Math.sqrt(Math.pow(cursorWorldPos.x - hitbox.box.position.x, 2) + Math.pow(cursorWorldPos.y - hitbox.box.position.y, 2))
            if (distanceFromCursor <= CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE && distanceFromCursor < minDistance) {
               closestEntity = entity;
               minDistance = distanceFromCursor;
            }
         }
      }
   }

   return closestEntity;
}

// @Cleanup: Function name. This doesn't just render the cursor tooltip, it updates debug info.
// Maybe seperate this into two functions?
export function renderCursorTooltip(): void {
   const targetTile = getMouseTargetTile();
   updateDebugInfoTile(targetTile);
 
   const targetEntity = getMouseTargetEntity();

   // If there is no target, hide the tooltip
   if (targetEntity === null) {
      if (isDev()) {
         updateDebugInfoEntity(null);
      }
      return;
   } else {
      updateDebugInfoEntity(targetEntity);
   }

   // Update the cursor tooltip
   const renderInfo = getEntityRenderInfo(targetEntity);
   // @Hack
   const transformComponent = TransformComponentArray.getComponent(targetEntity);
   const hitbox = transformComponent.hitboxes[0];
   // @Incomplete: doesn't account for render position
   const entityScreenPositionX = Camera.calculateXScreenPos(hitbox.box.position.x);
   const entityScreenPositionY = Camera.calculateYScreenPos(hitbox.box.position.y);

   const debugData = Game.getEntityDebugData();
   if (debugData === null || targetEntity === debugData.entityID) {
      updateCursorTooltip(debugData, entityScreenPositionX, entityScreenPositionY);
   }
}