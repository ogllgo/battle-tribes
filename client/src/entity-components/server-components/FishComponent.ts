import { randFloat, randInt } from "battletribes-shared/utils";
import { Entity, FishColour } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { TileType } from "battletribes-shared/tiles";
import Board from "../../Board";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createWaterSplashParticle } from "../../particles";
import { EntityIntermediateInfo, EntityParams, getEntityLayer } from "../../world";
import { getHitboxTile, TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { playSoundOnHitbox } from "../../sound";
import { Hitbox } from "../../hitboxes";

export interface FishComponentParams {
   readonly colour: FishColour;
}

interface IntermediateInfo {}

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

export const FishComponentArray = new ServerComponentArray<FishComponent, FishComponentParams, IntermediateInfo>(ServerComponentType.fish, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
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

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const fishComponentParams = entityParams.serverComponentParams[ServerComponentType.fish]!;
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(TEXTURE_SOURCES[fishComponentParams.colour])
      )
   );

   return {};
}

function createComponent(entityParams: EntityParams): FishComponent {
   return {
      colour: entityParams.serverComponentParams[ServerComponentType.fish]!.colour,
      waterOpacityMultiplier: randFloat(0.6, 1)
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   const layer = getEntityLayer(entity);
   
   const tile = getHitboxTile(layer, hitbox);
   if (tile.type !== TileType.water && Board.tickIntervalHasPassed(0.4)) {
      for (let i = 0; i < 8; i++) {
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = hitbox.box.position.x + 8 * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + 8 * Math.cos(spawnOffsetDirection);

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

function onHit(entity: Entity, hitbox: Hitbox): void {
   // Blood particles
   for (let i = 0; i < 5; i++) {
      const position = hitbox.box.position.offset(16, 2 * Math.PI * Math.random());
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, position.x, position.y, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
   }

   playSoundOnHitbox("fish-hurt-" + randInt(1, 4) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   createBloodParticleFountain(entity, 0.1, 0.8);
   
   playSoundOnHitbox("fish-die-1.mp3", 0.4, 1, entity, hitbox, false);
}