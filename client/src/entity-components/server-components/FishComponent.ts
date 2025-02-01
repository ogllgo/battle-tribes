import { randFloat, randInt } from "battletribes-shared/utils";
import { Entity, FishColour } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { TileType } from "battletribes-shared/tiles";
import Board from "../../Board";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createWaterSplashParticle } from "../../particles";
import { getEntityLayer } from "../../world";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityConfig } from "../ComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { playSoundOnEntity } from "../../sound";

export interface FishComponentParams {
   readonly colour: FishColour;
}

interface RenderParts {}

export interface FishComponent {
   readonly colour: FishColour;
   readonly waterOpacityMultiplier: number;
}

const TEXTURE_SOURCES: Record<FishColour, string> = {
   [FishColour.blue]: "entities/fish/fish-blue.png",
   [FishColour.gold]: "entities/fish/fish-gold.png",
   [FishColour.red]: "entities/fish/fish-red.png",
   [FishColour.lime]: "entities/fish/fish-lime.png"
};

export const FishComponentArray = new ServerComponentArray<FishComponent, FishComponentParams, RenderParts>(ServerComponentType.fish, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): FishComponentParams {
   const colour = reader.readNumber();
   return {
      colour: colour
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.fish, never>): RenderParts {
   const fishComponentParams = entityConfig.serverComponents[ServerComponentType.fish];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(TEXTURE_SOURCES[fishComponentParams.colour])
      )
   );

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.fish, never>): FishComponent {
   return {
      colour: entityConfig.serverComponents[ServerComponentType.fish].colour,
      waterOpacityMultiplier: randFloat(0.6, 1)
   };
}

function onTick(entity: Entity): void {
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

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Blood particles
   for (let i = 0; i < 5; i++) {
      const position = transformComponent.position.offset(16, 2 * Math.PI * Math.random());
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, position.x, position.y, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
   }

   playSoundOnEntity("fish-hurt-" + randInt(1, 4) + ".mp3", 0.4, 1, entity, false);
}

function onDie(entity: Entity): void {
   createBloodParticleFountain(entity, 0.1, 0.8);
   
   playSoundOnEntity("fish-die-1.mp3", 0.4, 1, entity, false);
}