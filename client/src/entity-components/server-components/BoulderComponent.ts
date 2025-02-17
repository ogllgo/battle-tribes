import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { randFloat, randItem } from "../../../../shared/src/utils";
import { createRockParticle, createRockSpeckParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { ROCK_HIT_SOUNDS, ROCK_DESTROY_SOUNDS, playSoundOnEntity } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityConfig } from "../ComponentArray";

export interface BoulderComponentParams {
   readonly boulderType: number;
}

interface RenderParts {}

export interface BoulderComponent {
   readonly boulderType: number;
}

const RADIUS = 40;

const TEXTURE_SOURCES = [
   "entities/boulder/boulder1.png",
   "entities/boulder/boulder2.png"
];

export const BoulderComponentArray = new ServerComponentArray<BoulderComponent, BoulderComponentParams, RenderParts>(ServerComponentType.boulder, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): BoulderComponentParams {
   const boulderType = reader.readNumber();
   return {
      boulderType: boulderType
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.boulder, never>): RenderParts {
   const boulderComponentParams = entityConfig.serverComponents[ServerComponentType.boulder];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(TEXTURE_SOURCES[boulderComponentParams.boulderType])
      )
   );

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.boulder, never>): BoulderComponent {
   return {
      boulderType: entityConfig.serverComponents[ServerComponentType.boulder].boulderType
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 2; i++) {
      let moveDirection = 2 * Math.PI * Math.random();

      const spawnPositionX = transformComponent.position.x + RADIUS * Math.sin(moveDirection);
      const spawnPositionY = transformComponent.position.y + RADIUS * Math.cos(moveDirection);

      moveDirection += randFloat(-1, 1);

      createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      createRockSpeckParticle(transformComponent.position.x, transformComponent.position.y, RADIUS, 0, 0, ParticleRenderLayer.low);
   }

   playSoundOnEntity(randItem(ROCK_HIT_SOUNDS), 0.3, 1, entity, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 5; i++) {
      const spawnOffsetMagnitude = RADIUS * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      createRockSpeckParticle(transformComponent.position.x, transformComponent.position.y, RADIUS, 0, 0, ParticleRenderLayer.low);
   }

   playSoundOnEntity(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, entity, false);
}