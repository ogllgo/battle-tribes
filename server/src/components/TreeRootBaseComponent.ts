import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { getAbsAngleDiff, randFloat } from "../../../shared/src/utils";
import { createTreeRootSegmentConfig } from "../entities/resources/tree-root-segment";
import { createEntity } from "../Entity";
import Layer from "../Layer";
import { getEntityLayer } from "../world";
import { ComponentArray } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export class TreeRootBaseComponent {}

export const TreeRootBaseComponentArray = new ComponentArray<TreeRootBaseComponent>(ServerComponentType.treeRootBase, true, getDataLength, addDataToPacket);
TreeRootBaseComponentArray.onJoin = onJoin;

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

const segmentWillBeInWall = (rootLayer: Layer, rootX: number, rootY: number, offsetDirection: number): boolean => {
   const MAX_OFFSET_MAGNITUDE = 64;
   const NUM_CHECKS = 4;
   
   for (let i = 1; i <= NUM_CHECKS; i++) {
      const offsetMagnitude = MAX_OFFSET_MAGNITUDE * i / NUM_CHECKS;

      const x = rootX + offsetMagnitude * Math.sin(offsetDirection);
      const y = rootY + offsetMagnitude * Math.cos(offsetDirection);
      const subtileX = Math.floor(x / Settings.SUBTILE_SIZE);
      const subtileY = Math.floor(y / Settings.SUBTILE_SIZE);
      const subtileIndex = getSubtileIndex(subtileX, subtileY);
      if (rootLayer.subtileCanHaveWall(subtileIndex)) {
         return true;
      }
   }

   return false;
}

function onJoin(treeRootBase: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(treeRootBase);
   const layer = getEntityLayer(treeRootBase);

   const spawnOffsetDirections = new Array<number>();

   const maxSegments = Math.random() < 2/3 ? 2 : 3;
   for (let i = 0, attempts = 0; i < maxSegments && attempts < 50; attempts++) {
      const offsetDirection = 2 * Math.PI * Math.random();

      // Make sure the segment won't spawn too close to another segment
      let isValid = true;
      for (const currentOffsetDirection of spawnOffsetDirections) {
         if (getAbsAngleDiff(offsetDirection, currentOffsetDirection) < Math.PI * 0.25) {
            isValid = false;
            break;
         }
      }
      if (!isValid) {
         continue;
      }

      if (segmentWillBeInWall(layer, transformComponent.position.x, transformComponent.position.y, offsetDirection)) {
         continue;
      }
      
      const offsetMagnitude = 38;
      const offsetX = offsetMagnitude * Math.sin(offsetDirection);
      const offsetY = offsetMagnitude * Math.cos(offsetDirection);

      const x = transformComponent.position.x + offsetX;
      const y = transformComponent.position.y + offsetY;

      const config = createTreeRootSegmentConfig();
      config.components[ServerComponentType.transform].position.x = x;
      config.components[ServerComponentType.transform].position.y = y;
      config.components[ServerComponentType.transform].rotation = offsetDirection + randFloat(-0.1, 0.1);
      createEntity(config, layer, 0);

      spawnOffsetDirections.push(offsetDirection);
      
      i++;
   }
}