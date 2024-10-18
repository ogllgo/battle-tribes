import { ServerComponentType } from "battletribes-shared/components";
import { DeathInfo, EntityID, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randInt } from "battletribes-shared/utils";
import { createDirtParticle } from "../../particles";
import { playSound } from "../../sound";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { PacketReader } from "battletribes-shared/packets";
import { getEntityAgeTicks } from "../../world";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";

export interface TombstoneComponentParams {
   readonly tombstoneType: number;
   readonly zombieSpawnProgress: number;
   readonly zombieSpawnX: number;
   readonly zombieSpawnY: number;
   readonly deathInfo: DeathInfo | null;
}

export interface TombstoneComponent {
   readonly tombstoneType: number;
   zombieSpawnProgress: number;
   zombieSpawnX: number;
   zombieSpawnY: number;
   readonly deathInfo: DeathInfo | null;
}

export const TombstoneComponentArray = new ServerComponentArray<TombstoneComponent, TombstoneComponentParams, never>(ServerComponentType.tombstone, true, {
   createParamsFromData: createParamsFromData,
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

function createComponent(entityConfig: EntityConfig<ServerComponentType.tombstone>): TombstoneComponent {
   const tombstoneComponentParams = entityConfig.components[ServerComponentType.tombstone];
   
   return {
      tombstoneType:tombstoneComponentParams. tombstoneType,
      zombieSpawnProgress:tombstoneComponentParams. zombieSpawnProgress,
      zombieSpawnX:tombstoneComponentParams. zombieSpawnX,
      zombieSpawnY:tombstoneComponentParams. zombieSpawnY,
      deathInfo:tombstoneComponentParams. deathInfo
   };
}

function onTick(tombstoneComponent: TombstoneComponent, entity: EntityID): void {
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

function updateFromData(reader: PacketReader, entity: EntityID): void {
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