import { EntityInfo } from "../../shared/src/board-interface";
import { Entity } from "../../shared/src/entities";
import { WorldInfo } from "../../shared/src/structures";
import Layer from "./Layer";
import { getEntityType } from "./world";
import { TransformComponentArray } from "./components/TransformComponent";

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
      subtileIsMined: subtileIndex => layer.subtileIsMined(subtileIndex)
   };
   worldInfos.push(worldInfo);
}

export function getLayerInfo(layer: Layer): WorldInfo {
   return worldInfos[layer.depth];
}