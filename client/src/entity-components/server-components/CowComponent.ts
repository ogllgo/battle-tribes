import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { angle, randFloat, randInt } from "battletribes-shared/utils";
import Board from "../../Board";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createDirtParticle } from "../../particles";
import { playSoundOnEntity } from "../../sound";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { CowSpecies, Entity } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { getEntityLayer } from "../../world";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { HitData } from "../../../../shared/src/client-server-types";
import { EntityConfig } from "../ComponentArray";

export interface CowComponentParams {
   readonly species: CowSpecies;
   readonly grazeProgress: number;
}

interface RenderParts {}

export interface CowComponent {
   readonly species: CowSpecies;
   grazeProgress: number;
}

const HEAD_SIZE = 64;
/** How far the head overlaps the body */
const HEAD_OVERLAP = 24;
const BODY_HEIGHT = 96;

export const CowComponentArray = new ServerComponentArray<CowComponent, CowComponentParams, RenderParts>(ServerComponentType.cow, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): CowComponentParams {
   const species = reader.readNumber();
   const grazeProgress = reader.readNumber();

   return {
      species: species,
      grazeProgress: grazeProgress
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.cow, never>): RenderParts {
   const cowComponentParams = entityConfig.serverComponents[ServerComponentType.cow];
   const cowNum = cowComponentParams.species === CowSpecies.brown ? 1 : 2;

   // Body
   const bodyRenderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(`entities/cow/cow-body-${cowNum}.png`)
   );
   bodyRenderPart.offset.y = -(HEAD_SIZE - HEAD_OVERLAP) / 2;
   renderInfo.attachRenderPart(bodyRenderPart);

   // Head
   const headRenderPart = new TexturedRenderPart(
      null,
      1,
      0,
      getTextureArrayIndex(`entities/cow/cow-head-${cowNum}.png`)
   );
   headRenderPart.offset.y = (BODY_HEIGHT - HEAD_OVERLAP) / 2;
   renderInfo.attachRenderPart(headRenderPart);

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.cow, never>): CowComponent {
   const cowComponentParams = entityConfig.serverComponents[ServerComponentType.cow];
   
   return {
      species: cowComponentParams.species,
      grazeProgress: cowComponentParams.grazeProgress
   };
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const cowComponent = CowComponentArray.getComponent(entity);

   if (cowComponent.grazeProgress !== -1 && Board.tickIntervalHasPassed(0.1)) {
      const spawnOffsetMagnitude = 30 * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
      createDirtParticle(spawnPositionX, spawnPositionY, ParticleRenderLayer.low);
   }

   if (Math.random() < 0.1 / Settings.TPS) {
      playSoundOnEntity("cow-ambient-" + randInt(1, 3) + ".mp3", 0.2, 1, entity);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const cowComponent = CowComponentArray.getComponent(entity);
   
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   const grazeProgress = reader.readNumber();
   
   // When the cow has finished grazing, create a bunch of dirt particles
   if (grazeProgress < cowComponent.grazeProgress) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const layer = getEntityLayer(entity);
      
      const tile = getEntityTile(layer, transformComponent);
      for (let i = 0; i < 15; i++) {
         const x = (tile.x + Math.random()) * Settings.TILE_SIZE;
         const y = (tile.y + Math.random()) * Settings.TILE_SIZE;
         createDirtParticle(x, y, ParticleRenderLayer.low);
      }
   }
   cowComponent.grazeProgress = grazeProgress;
}

function onHit(entity: Entity, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
         
   // Blood pool particles
   for (let i = 0; i < 2; i++) {
      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
   }
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = transformComponent.position.x + 32 * Math.sin(offsetDirection);
      const spawnPositionY = transformComponent.position.y + 32 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
   }

   playSoundOnEntity("cow-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, entity);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < 3; i++) {
      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 35);
   }

   createBloodParticleFountain(entity, 0.1, 1.1);

   playSoundOnEntity("cow-die-1.mp3", 0.2, 1, entity);
}