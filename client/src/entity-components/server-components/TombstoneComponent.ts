import { ServerComponentType } from "battletribes-shared/components";
import { DeathInfo, Entity, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randFloat, randInt, randItem } from "battletribes-shared/utils";
import { createDirtParticle, createRockParticle, createRockSpeckParticle } from "../../particles";
import { playSound, ROCK_DESTROY_SOUNDS, ROCK_HIT_SOUNDS } from "../../sound";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { PacketReader } from "battletribes-shared/packets";
import { getEntityAgeTicks } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { EntityConfig } from "../ComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { TransformComponentArray } from "./TransformComponent";

export interface TombstoneComponentParams {
   readonly tombstoneType: number;
   readonly zombieSpawnProgress: number;
   readonly zombieSpawnX: number;
   readonly zombieSpawnY: number;
   readonly deathInfo: DeathInfo | null;
}

interface RenderParts {}

export interface TombstoneComponent {
   readonly tombstoneType: number;
   zombieSpawnProgress: number;
   zombieSpawnX: number;
   zombieSpawnY: number;
   readonly deathInfo: DeathInfo | null;
}

const HITBOX_WIDTH = 48;
const HITBOX_HEIGHT = 88;

export const TombstoneComponentArray = new ServerComponentArray<TombstoneComponent, TombstoneComponentParams, RenderParts>(ServerComponentType.tombstone, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): TombstoneComponentParams {
   const tombstoneType = reader.readNumber();
   const zombieSpawnProgress = reader.readNumber();
   const zombieSpawnX = reader.readNumber();
   const zombieSpawnY = reader.readNumber();

   const hasDeathInfo = reader.readBoolean();
   reader.padOffset(3);
   
   let deathInfo: DeathInfo | null;
   if (hasDeathInfo) {
      // @Hack: hardcoded
      const username = reader.readString(100);
      const causeOfDeath = reader.readNumber() as PlayerCauseOfDeath;
      deathInfo = {
         username: username,
         causeOfDeath: causeOfDeath
      };
   } else {
      deathInfo = null;
   }

   return {
      tombstoneType: tombstoneType,
      zombieSpawnProgress: zombieSpawnProgress,
      zombieSpawnX: zombieSpawnX,
      zombieSpawnY: zombieSpawnY,
      deathInfo: deathInfo
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.tombstone, never>): RenderParts {
   const tombstoneComponentParams = entityConfig.serverComponents[ServerComponentType.tombstone];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(`entities/tombstone/tombstone${tombstoneComponentParams.tombstoneType + 1}.png`)
      )
   );

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.tombstone, never>): TombstoneComponent {
   const tombstoneComponentParams = entityConfig.serverComponents[ServerComponentType.tombstone];
   
   return {
      tombstoneType:tombstoneComponentParams. tombstoneType,
      zombieSpawnProgress:tombstoneComponentParams. zombieSpawnProgress,
      zombieSpawnX:tombstoneComponentParams. zombieSpawnX,
      zombieSpawnY:tombstoneComponentParams. zombieSpawnY,
      deathInfo:tombstoneComponentParams. deathInfo
   };
}

function onTick(entity: Entity): void {
   const tombstoneComponent = TombstoneComponentArray.getComponent(entity);
   if (tombstoneComponent.zombieSpawnProgress !== -1) {
      // Create zombie digging particles
      if (tombstoneComponent.zombieSpawnProgress < 0.8) {
         if (Math.random() < 7.5 / Settings.TPS) {
            createDirtParticle(tombstoneComponent.zombieSpawnX, tombstoneComponent.zombieSpawnY, ParticleRenderLayer.low);
         }
      } else {
         if (Math.random() < 20 / Settings.TPS) {
            createDirtParticle(tombstoneComponent.zombieSpawnX, tombstoneComponent.zombieSpawnY, ParticleRenderLayer.low);
         }
      }

      if (getEntityAgeTicks(entity) % 6 === 0) {
         playSound("zombie-dig-" + randInt(1, 5) + ".mp3", 0.15, 1, new Point(tombstoneComponent.zombieSpawnX, tombstoneComponent.zombieSpawnY));
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);

   const hasDeathInfo = reader.readBoolean();
   reader.padOffset(3);
   if (hasDeathInfo) {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT + 100 + Float32Array.BYTES_PER_ELEMENT);
   }
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const tombstoneComponent = TombstoneComponentArray.getComponent(entity);
   
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

   tombstoneComponent.zombieSpawnProgress = reader.readNumber();
   tombstoneComponent.zombieSpawnX = reader.readNumber();
   tombstoneComponent.zombieSpawnY = reader.readNumber();

   const hasDeathInfo = reader.readBoolean();
   reader.padOffset(3);
   if (hasDeathInfo) {
      reader.padOffset(100 + Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT);
   }
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 4; i++) {
      const spawnPositionX = transformComponent.position.x + randFloat(-HITBOX_WIDTH/2, HITBOX_WIDTH/2);
      const spawnPositionY = transformComponent.position.y + randFloat(-HITBOX_HEIGHT/2, HITBOX_HEIGHT/2);

      let moveDirection = Math.PI/2 - Math.atan2(spawnPositionY, spawnPositionX);
      moveDirection += randFloat(-1, 1);
      
      createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 8; i++) {
      const spawnPositionX = transformComponent.position.x + randFloat(-HITBOX_WIDTH/2, HITBOX_WIDTH/2);
      const spawnPositionY = transformComponent.position.y + randFloat(-HITBOX_HEIGHT/2, HITBOX_HEIGHT/2);

      createRockSpeckParticle(spawnPositionX, spawnPositionY, 0, 0, 0, ParticleRenderLayer.low);
   }

   playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, transformComponent.position);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 8; i++) {
      const spawnPositionX = transformComponent.position.x + randFloat(-HITBOX_WIDTH/2, HITBOX_WIDTH/2);
      const spawnPositionY = transformComponent.position.y + randFloat(-HITBOX_HEIGHT/2, HITBOX_HEIGHT/2);

      createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      const spawnPositionX = transformComponent.position.x + randFloat(-HITBOX_WIDTH/2, HITBOX_WIDTH/2);
      const spawnPositionY = transformComponent.position.y + randFloat(-HITBOX_HEIGHT/2, HITBOX_HEIGHT/2);

      createRockSpeckParticle(spawnPositionX, spawnPositionY, 0, 0, 0, ParticleRenderLayer.low);
   }

   playSound(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, transformComponent.position);
}