import { ServerComponentType } from "battletribes-shared/components";
import { DeathInfo, Entity, DamageSource } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randAngle, randFloat, randInt, randItem } from "battletribes-shared/utils";
import { createDirtParticle, createRockParticle, createRockSpeckParticle } from "../../particles";
import { playSound, playSoundOnHitbox, ROCK_DESTROY_SOUNDS, ROCK_HIT_SOUNDS } from "../../sound";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { PacketReader } from "battletribes-shared/packets";
import { EntityParams, getEntityAgeTicks, getEntityLayer } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface TombstoneComponentParams {
   readonly tombstoneType: number;
   readonly zombieSpawnProgress: number;
   readonly zombieSpawnX: number;
   readonly zombieSpawnY: number;
   readonly deathInfo: DeathInfo | null;
}

interface IntermediateInfo {}

export interface TombstoneComponent {
   readonly tombstoneType: number;
   zombieSpawnProgress: number;
   zombieSpawnX: number;
   zombieSpawnY: number;
   readonly deathInfo: DeathInfo | null;
}

const HITBOX_WIDTH = 48;
const HITBOX_HEIGHT = 88;

export const TombstoneComponentArray = new ServerComponentArray<TombstoneComponent, TombstoneComponentParams, IntermediateInfo>(ServerComponentType.tombstone, true, {
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

function createParamsFromData(reader: PacketReader): TombstoneComponentParams {
   const tombstoneType = reader.readNumber();
   const zombieSpawnProgress = reader.readNumber();
   const zombieSpawnX = reader.readNumber();
   const zombieSpawnY = reader.readNumber();

   const hasDeathInfo = reader.readBoolean();
   reader.padOffset(3);
   
   let deathInfo: DeathInfo | null;
   if (hasDeathInfo) {
      const username = reader.readString();
      const damageSource = reader.readNumber() as DamageSource;
      deathInfo = {
         username: username,
         damageSource: damageSource
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

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const tombstoneComponentParams = entityParams.serverComponentParams[ServerComponentType.tombstone]!;
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(`entities/tombstone/tombstone${tombstoneComponentParams.tombstoneType + 1}.png`)
      )
   );

   return {};
}

function createComponent(entityParams: EntityParams): TombstoneComponent {
   const tombstoneComponentParams = entityParams.serverComponentParams[ServerComponentType.tombstone]!;
   
   return {
      tombstoneType:tombstoneComponentParams. tombstoneType,
      zombieSpawnProgress:tombstoneComponentParams. zombieSpawnProgress,
      zombieSpawnX:tombstoneComponentParams. zombieSpawnX,
      zombieSpawnY:tombstoneComponentParams. zombieSpawnY,
      deathInfo:tombstoneComponentParams. deathInfo
   };
}

function getMaxRenderParts(): number {
   return 1;
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
         playSound("zombie-dig-" + randInt(1, 5) + ".mp3", 0.15, 1, new Point(tombstoneComponent.zombieSpawnX, tombstoneComponent.zombieSpawnY), getEntityLayer(entity));
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);

   const hasDeathInfo = reader.readBoolean();
   reader.padOffset(3);
   if (hasDeathInfo) {
      reader.padString();
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
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
      reader.padString();
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   for (let i = 0; i < 4; i++) {
      const spawnPositionX = hitbox.box.position.x + randFloat(-HITBOX_WIDTH/2, HITBOX_WIDTH/2);
      const spawnPositionY = hitbox.box.position.y + randFloat(-HITBOX_HEIGHT/2, HITBOX_HEIGHT/2);

      // @HACK @Robustness
      let moveDirection = Math.PI/2 - Math.atan2(spawnPositionY, spawnPositionX);
      moveDirection += randFloat(-1, 1);
      
      createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 8; i++) {
      const spawnPositionX = hitbox.box.position.x + randFloat(-HITBOX_WIDTH/2, HITBOX_WIDTH/2);
      const spawnPositionY = hitbox.box.position.y + randFloat(-HITBOX_HEIGHT/2, HITBOX_HEIGHT/2);

      createRockSpeckParticle(spawnPositionX, spawnPositionY, 0, 0, 0, ParticleRenderLayer.low);
   }

   // @Hack @Temporary
   playSoundOnHitbox(randItem(ROCK_HIT_SOUNDS), 0.3, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   for (let i = 0; i < 8; i++) {
      const spawnPositionX = hitbox.box.position.x + randFloat(-HITBOX_WIDTH/2, HITBOX_WIDTH/2);
      const spawnPositionY = hitbox.box.position.y + randFloat(-HITBOX_HEIGHT/2, HITBOX_HEIGHT/2);

      createRockParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      const spawnPositionX = hitbox.box.position.x + randFloat(-HITBOX_WIDTH/2, HITBOX_WIDTH/2);
      const spawnPositionY = hitbox.box.position.y + randFloat(-HITBOX_HEIGHT/2, HITBOX_HEIGHT/2);

      createRockSpeckParticle(spawnPositionX, spawnPositionY, 0, 0, 0, ParticleRenderLayer.low);
   }

   // @Hack @Temporary
   playSoundOnHitbox(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, entity, hitbox, false);
}