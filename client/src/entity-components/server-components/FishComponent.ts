import { randFloat } from "battletribes-shared/utils";
import { EntityID, FishColour } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { TileType } from "battletribes-shared/tiles";
import Board from "../../Board";
import { createWaterSplashParticle } from "../../particles";
import { getEntityLayer } from "../../world";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";

export interface FishComponentParams {
   readonly colour: FishColour;
}

export interface FishComponent {
   readonly colour: FishColour;
   readonly waterOpacityMultiplier: number;
}

export const FishComponentArray = new ServerComponentArray<FishComponent, FishComponentParams, never>(ServerComponentType.fish, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): FishComponentParams {
   const colour = reader.readNumber();
   return {
      colour: colour
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.fish>): FishComponent {
   return {
      colour: entityConfig.components[ServerComponentType.fish].colour,
      waterOpacityMultiplier: randFloat(0.6, 1)
   };
}

function onTick(_fishComponent: FishComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const layer = getEntityLayer(entity);
   
   const tile = getEntityTile(layer, transformComponent);
   if (tile.type !== TileType.water && Board.tickIntervalHasPassed(0.4)) {
      for (let i = 0; i < 8; i++) {
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + 8 * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + 8 * Math.cos(spawnOffsetDirection);

         createWaterSplashParticle(spawnPositionX, spawnPositionY);
      }
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}