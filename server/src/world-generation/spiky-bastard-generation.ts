import { ServerComponentType } from "../../../shared/src/components";
import { Settings } from "../../../shared/src/settings";
import { getSubtileIndex, subtileIsInWorld } from "../../../shared/src/subtiles";
import { SubtileType } from "../../../shared/src/tiles";
import { angle, randSign } from "../../../shared/src/utils";
import { createSpikyBastardConfig } from "../entities/spiky-bastard";
import { createEntity } from "../Entity";
import { generatePerlinNoise } from "../perlin-noise";
import { pushJoinBuffer, undergroundLayer } from "../world";

const enum Vars {
   /** Number of spiky bastards attempted to be generated per tile */
   GENERATION_DENSITY = 9
}

export function generateSpikyBastards(): void {
   // @Incomplete: generate in edges

   const numBastards = Math.ceil(Settings.BOARD_DIMENSIONS * Settings.BOARD_DIMENSIONS * Vars.GENERATION_DENSITY);
   const noise = generatePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, 8);
   
   for (let i = 0; i < numBastards; i++) {
      const attachedSubtileX = Math.floor(Settings.BOARD_DIMENSIONS * 4 * Math.random());
      const attachedSubtileY = Math.floor(Settings.BOARD_DIMENSIONS * 4 * Math.random());

      // Make sure the bastard will be attached to a wall
      const attachedSubtileIndex = getSubtileIndex(attachedSubtileX, attachedSubtileY);
      const attachedSubtileType = undergroundLayer.getSubtileType(attachedSubtileIndex);
      if (attachedSubtileType === SubtileType.none) {
         continue;
      }

      // Factor in the noise spawn chance
      const tileX = attachedSubtileX >> 2;
      const tileY = attachedSubtileY >> 2;
      let spawnChance = noise[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
      spawnChance *= spawnChance;
      if (Math.random() >= spawnChance) {
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

      // Make sure the bastard wouldn't go out of the world
      const finalSubtileX = attachedSubtileX + moveDirX * 2;
      const finalSubtileY = attachedSubtileY + moveDirY * 2;
      if (!subtileIsInWorld(finalSubtileX, finalSubtileY)) {
         continue;
      }

      // @Incomplete: Make sure it wouldn't intersect with any other bastards

      // Make sure the space is free
      if (undergroundLayer.getSubtileXYType(attachedSubtileX + moveDirX, attachedSubtileY + moveDirY) === SubtileType.none &&
          undergroundLayer.getSubtileXYType(attachedSubtileX + moveDirX * 2, attachedSubtileY + moveDirY * 2) === SubtileType.none) {
         const x = (attachedSubtileX + 0.5 + moveDirX * 1.5) * Settings.SUBTILE_SIZE;
         const y = (attachedSubtileY + 0.5 + moveDirY * 1.5) * Settings.SUBTILE_SIZE;

         const config = createSpikyBastardConfig();
         config.components[ServerComponentType.transform].position.x = x;
         config.components[ServerComponentType.transform].position.y = y;
         config.components[ServerComponentType.transform].rotation = angle(moveDirX, moveDirY);
         createEntity(config, undergroundLayer, 0);
         
         pushJoinBuffer(false);
      }
   }
}