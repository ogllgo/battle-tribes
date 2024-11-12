import { Entity, SNOWBALL_SIZES, SnowballSize } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { randFloat, randInt } from "battletribes-shared/utils";
import Board from "../../Board";
import { createSnowParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityConfig } from "../ComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import Particle from "../../Particle";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";

export interface SnowballComponentParams {
   readonly size: SnowballSize;
}

interface RenderParts {}

export interface SnowballComponent {
   readonly size: SnowballSize;
}

export const SnowballComponentArray = new ServerComponentArray<SnowballComponent, SnowballComponentParams, RenderParts>(ServerComponentType.snowball, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): SnowballComponentParams {
   const size = reader.readNumber();

   return {
      size: size
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.snowball, never>): RenderParts {
   const snowballComponentParams = entityConfig.serverComponents[ServerComponentType.snowball];
   
   let textureSource: string;
   switch (snowballComponentParams.size) {
      case SnowballSize.small: {
         textureSource = "entities/snowball/snowball-small.png";
         break;
      }
      case SnowballSize.large: {
         textureSource = "entities/snowball/snowball-large.png";
         break;
      }
   }

   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(textureSource)
      )
   );

   return {};
}
   
function createComponent(entityConfig: EntityConfig<ServerComponentType.snowball, never>): SnowballComponent {
   return {
      size: entityConfig.serverComponents[ServerComponentType.snowball].size
   };
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if ((physicsComponent.selfVelocity.x !== 0 || physicsComponent.selfVelocity.y !== 0) && physicsComponent.selfVelocity.lengthSquared() > 2500) {
      if (Board.tickIntervalHasPassed(0.05)) {
         createSnowParticle(transformComponent.position.x, transformComponent.position.y, randFloat(40, 60));
      }
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

const createSnowSpeckParticle = (spawnPositionX: number, spawnPositionY: number): void => {
   const lifetime = randFloat(0.3, 0.4);

   const pixelSize = randInt(4, 8);

   const velocityMagnitude = randFloat(40, 80);
   const velocityDirection = 2 * Math.PI * Math.random();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const colour = randFloat(0.7, 0.95);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.2,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      colour, colour, colour
   );
   Board.lowMonocolourParticles.push(particle);
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const snowballComponent = SnowballComponentArray.getComponent(entity);
   
   // Create a bunch of snow particles at the point of hit
   const numParticles = snowballComponent.size === SnowballSize.large ? 10 : 7;
   for (let i = 0; i < numParticles; i++) {
      const pixelSize = SNOWBALL_SIZES[snowballComponent.size];
      
      const position = transformComponent.position.offset(pixelSize / 2, 2 * Math.PI * Math.random());
      createSnowSpeckParticle(position.x, position.y);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const snowballComponent = SnowballComponentArray.getComponent(entity);

   // Create a bunch of snow particles throughout the snowball
   const numParticles = snowballComponent.size === SnowballSize.large ? 25 : 15;
   for (let i = 0; i < numParticles; i++) {
      const pixelSize = SNOWBALL_SIZES[snowballComponent.size];
      
      const offsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + pixelSize / 2 * Math.sin(offsetDirection);
      const spawnPositionY = transformComponent.position.y + pixelSize / 2 * Math.cos(offsetDirection);
      createSnowSpeckParticle(spawnPositionX, spawnPositionY);
   }
}