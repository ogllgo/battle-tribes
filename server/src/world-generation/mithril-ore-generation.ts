import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { getSubtileIndex, subtileIsInWorld } from "../../../shared/src/subtiles";
import { SubtileType } from "../../../shared/src/tiles";
import { angle, randFloat, randInt, randSign } from "../../../shared/src/utils";
import { getEntitiesInRange } from "../ai-shared";
import { createMithrilOreNodeConfig } from "../entities/resources/mithril-ore-node";
import { createEntity } from "../Entity";
import Layer from "../Layer";
import { getEntityType, pushJoinBuffer } from "../world";

const enum Vars {
   /** Number of spiky bastards attempted to be generated per tile */
   INITIAL_SPAWN_ATTEMPT_DENSITY = 9
}

const getNumChildren = (currentDepth: number): number => {
   if (currentDepth === 0) {
      return randInt(2, 3);
   }
   if (currentDepth === 1) {
      return 2;
   }
   return 0;
}

const spawnMithrilOre = (layer: Layer, x: number, y: number, direction: number, currentDepth: number): Entity => {
   const children = new Array<Entity>();
   
   const numChildren = getNumChildren(currentDepth);

   let size: number;
   let variant: number;
   let minOffsetMagnitude: number;
   let maxOffsetMagnitude: number;
   if (currentDepth === 0) {
      // Large
      size = 0;
      variant = randInt(0, 0);
      minOffsetMagnitude = 18;
      maxOffsetMagnitude = 22;
   } else if (numChildren > 0) {
      // Medium
      size = 1;
      variant = randInt(0, 1);
      minOffsetMagnitude = 14;
      maxOffsetMagnitude = 17;
   } else {
      // Small
      size = 2;
      variant = randInt(0, 1);
      minOffsetMagnitude = 0;
      maxOffsetMagnitude = 0;
   }
   
   for (let i = 0; i < numChildren; i++) {
      const offsetMagnitude = randFloat(minOffsetMagnitude, maxOffsetMagnitude);
      const offsetDirection = direction + (i - (numChildren - 1) * 0.5) * 1.35 + randFloat(-0.15, 0.15);

      const childX = x + offsetMagnitude * Math.sin(offsetDirection);
      const childY = y + offsetMagnitude * Math.cos(offsetDirection);

      const child = spawnMithrilOre(layer, childX, childY, offsetDirection, currentDepth + 1);
      children.push(child);
   }
   
   const renderHeight = (2 - currentDepth) * 0.5 + Math.random() * 0.1;

   const config = createMithrilOreNodeConfig(size, variant, children, renderHeight);
   config.components[ServerComponentType.transform].position.x = x;
   config.components[ServerComponentType.transform].position.y = y;
   config.components[ServerComponentType.transform].rotation = direction + randFloat(-0.1, 0.1);
   const entity = createEntity(config, layer, 0);
   
   pushJoinBuffer(false);

   return entity;
}

const canSpawnMithrilOre = (layer: Layer, x: number, y: number): boolean => {
   // Don't spawn mithril too close together
   const entities = getEntitiesInRange(layer, x, y, 42);
   for (const entity of entities) {
      if (getEntityType(entity) === EntityType.mithrilOreNode) {
         return false;
      }
   }

   return true;
}

export function generateMithrilOre(undergroundLayer: Layer): void {
   // @Incomplete: generate in edges

   const numOres = Math.ceil(Settings.BOARD_DIMENSIONS * Settings.BOARD_DIMENSIONS * Vars.INITIAL_SPAWN_ATTEMPT_DENSITY);
   
   for (let i = 0; i < numOres; i++) {
      const attachedSubtileX = Math.floor(Settings.BOARD_DIMENSIONS * 4 * Math.random());
      const attachedSubtileY = Math.floor(Settings.BOARD_DIMENSIONS * 4 * Math.random());
      
      // Don't spawn on air
      const attachedSubtileIndex = getSubtileIndex(attachedSubtileX, attachedSubtileY);
      const attachedSubtileType = undergroundLayer.getSubtileType(attachedSubtileIndex);
      if (attachedSubtileType === SubtileType.none) {
         continue;
      }

      const tileX = Math.floor(attachedSubtileX / 4);
      const tileY = Math.floor(attachedSubtileY / 4);
      if (undergroundLayer.getTileMithrilRichness(tileX, tileY) === 0) {
         continue;
      }

      let moveDirX: number;
      let moveDirY: number;
      if (Math.random() < 0.5) {
         moveDirX = randSign();
         moveDirY = 0;
      } else {
         moveDirX = 0;
         moveDirY = randSign();
      }

      // Check right subtile
      if (subtileIsInWorld(attachedSubtileX + moveDirY, attachedSubtileY + moveDirX)) {
         const subtileIndex = getSubtileIndex(attachedSubtileX + moveDirY, attachedSubtileY + moveDirX);
         if (undergroundLayer.getSubtileType(subtileIndex) === SubtileType.none) {
            continue;
         }
      }

      // Check left subtile
      if (subtileIsInWorld(attachedSubtileX - moveDirY, attachedSubtileY - moveDirX)) {
         const subtileIndex = getSubtileIndex(attachedSubtileX - moveDirY, attachedSubtileY - moveDirX);
         if (undergroundLayer.getSubtileType(subtileIndex) === SubtileType.none) {
            continue;
         }
      }

      // Make sure the space is free
      if (undergroundLayer.getSubtileXYType(attachedSubtileX + moveDirX, attachedSubtileY + moveDirY) === SubtileType.none) {
         const x = (attachedSubtileX + 0.5 + moveDirX * 1.2) * Settings.SUBTILE_SIZE;
         const y = (attachedSubtileY + 0.5 + moveDirY * 1.2) * Settings.SUBTILE_SIZE;
         if (canSpawnMithrilOre(undergroundLayer, x, y)) {
            const direction = angle(moveDirX, moveDirY) + randFloat(-0.3, 0.3);
            spawnMithrilOre(undergroundLayer, x, y, direction, 0);
         }
      }
   }
}