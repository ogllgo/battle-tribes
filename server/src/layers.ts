import { EntityInfo } from "../../shared/src/board-interface";
import { Entity } from "../../shared/src/entities";
import { WorldInfo } from "../../shared/src/structures";
import Layer from "./Layer";
import { getEntityType } from "./world";
import { TransformComponentArray } from "./components/TransformComponent";
import { Settings } from "../../shared/src/settings";
import { TileType } from "../../shared/src/tiles";
import { getTileIndexIncludingEdges, getTileX, getTileY, tileIsInWorld } from "../../shared/src/utils";

// @Cleanup: this should probably be layerInfos
const worldInfos = new Array<WorldInfo>();

export const surfaceLayer = new Layer(0);
export const undergroundLayer = new Layer(1);
export const layers = [surfaceLayer, undergroundLayer];

for (const layer of layers) {
   const worldInfo: WorldInfo = {
      chunks: layer.chunks,
      wallSubtileTypes: layer.wallSubtileTypes,
      getEntityCallback: (entity: Entity): EntityInfo => {
         const transformComponent = TransformComponentArray.getComponent(entity);
   
         return {
            type: getEntityType(entity),
            position: transformComponent.position,
            rotation: transformComponent.rotation,
            id: entity,
            hitboxes: transformComponent.hitboxes
         };
      },
      subtileIsMined: subtileIndex => layer.subtileIsMined(subtileIndex),
      tileIsBuildingBlocking: tileIndex => layer.buildingBlockingTiles.has(tileIndex)
   };
   worldInfos.push(worldInfo);
}

export function getLayerInfo(layer: Layer): WorldInfo {
   return worldInfos[layer.depth];
}

export function addLayerBuildingBlockingTiles(layer: Layer): void {
   // Initially find all tiles below a dropdown tile
   for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (surfaceLayer.getTileType(tileIndex) === TileType.dropdown) {
            layer.buildingBlockingTiles.add(tileIndex);
         }
      }
   }

   // Expand the tiles to their neighbours
   for (let i = 0; i < 3; i++) {
      const tilesToExpand = Array.from(layer.buildingBlockingTiles);

      for (const tileIndex of tilesToExpand) {
         const tileX = getTileX(tileIndex);
         const tileY = getTileY(tileIndex);
         
         if (tileIsInWorld(tileX + 1, tileY)) {
            layer.buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX + 1, tileY));
         }
         if (tileIsInWorld(tileX, tileY + 1)) {
            layer.buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX, tileY + 1));
         }
         if (tileIsInWorld(tileX - 1, tileY)) {
            layer.buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX - 1, tileY));
         }
         if (tileIsInWorld(tileX, tileY - 1)) {
            layer.buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX, tileY - 1));
         }
      }
   }
}