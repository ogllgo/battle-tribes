import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { addMonocolourParticleToBufferContainer, ParticleColour, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { Entity } from "../../../../shared/src/entities";
import { randFloat, randInt } from "../../../../shared/src/utils";
import Board from "../../Board";
import Particle from "../../Particle";
import { playSound, playSoundOnEntity } from "../../sound";
import { TransformComponent, TransformComponentArray } from "./TransformComponent";

export interface IceSpikesComponentParams {}

interface RenderParts {}

export interface IceSpikesComponent {}

const ICE_SPECK_COLOUR: ParticleColour = [140/255, 143/255, 207/255];

const SIZE = 80;

export const IceSpikesComponentArray = new ServerComponentArray<IceSpikesComponent, IceSpikesComponentParams, RenderParts>(ServerComponentType.iceSpikes, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): IceSpikesComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(`entities/ice-spikes/ice-spikes.png`)
      )
   );

   return {};
}

function createComponent(): IceSpikesComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}

const createIceSpeckProjectile = (transformComponent: TransformComponent): void => {
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = transformComponent.position.x + SIZE / 2 * Math.sin(spawnOffsetDirection);
   const spawnPositionY = transformComponent.position.y + SIZE / 2 * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(150, 300);
   const velocityDirection = spawnOffsetDirection + randFloat(-0.8, 0.8);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
   const lifetime = randFloat(0.1, 0.2);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / particle.lifetime, 2);
   }

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      4,
      8,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      velocityDirection,
      0,
      0,
      0,
      ICE_SPECK_COLOUR[0], ICE_SPECK_COLOUR[1], ICE_SPECK_COLOUR[2]
   );
   Board.lowMonocolourParticles.push(particle);
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Create ice particles on hit
   for (let i = 0; i < 10; i++) {
      createIceSpeckProjectile(transformComponent);
   }
   
   playSoundOnEntity("ice-spikes-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 15; i++) {
      createIceSpeckProjectile(transformComponent);
   }
   
   playSoundOnEntity("ice-spikes-destroy.mp3", 0.4, 1, entity, false);
}