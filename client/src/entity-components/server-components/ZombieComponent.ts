import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { angle, randFloat, randInt } from "battletribes-shared/utils";
import { playSoundOnEntity } from "../../sound";
import { PacketReader } from "battletribes-shared/packets";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityConfig } from "../ComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { HitData } from "../../../../shared/src/client-server-types";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain } from "../../particles";

export interface ZombieComponentParams {
   readonly zombieType: number;
}

interface RenderParts {}
   
export interface ZombieComponent {
   readonly zombieType: number;
}

const RADIUS = 32;

const ZOMBIE_TEXTURE_SOURCES: ReadonlyArray<string> = ["entities/zombie/zombie1.png", "entities/zombie/zombie2.png", "entities/zombie/zombie3.png", "entities/zombie/zombie-golden.png"];
const ZOMBIE_HAND_TEXTURE_SOURCES: ReadonlyArray<string> = ["entities/zombie/fist-1.png", "entities/zombie/fist-2.png", "entities/zombie/fist-3.png", "entities/zombie/fist-4.png"];

export const ZombieComponentArray = new ServerComponentArray<ZombieComponent, ZombieComponentParams, RenderParts>(ServerComponentType.zombie, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): ZombieComponentParams {
   const zombieType = reader.readNumber();
   return {
      zombieType: zombieType
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.zombie, never>): RenderParts {
   const zombieComponentParams = entityConfig.serverComponents[ServerComponentType.zombie];

   // Body render part
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         2,
         0,
         getTextureArrayIndex(ZOMBIE_TEXTURE_SOURCES[zombieComponentParams.zombieType])
      )
   );

   // Hand render parts
   const handTextureSource = ZOMBIE_HAND_TEXTURE_SOURCES[zombieComponentParams.zombieType];
   const handRenderParts = new Array<VisualRenderPart>();
   for (let i = 0; i < 2; i++) {
      const renderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex(handTextureSource)
      );
      renderPart.addTag("inventoryUseComponent:hand");
      renderInfo.attachRenderPart(renderPart);
      handRenderParts.push(renderPart);
   }

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.zombie, never>): ZombieComponent {
   return {
      zombieType: entityConfig.serverComponents[ServerComponentType.zombie].zombieType
   };
}

function getMaxRenderParts(): number {
   return 3;
}

function onTick(entity: Entity): void {
   // @Sync should be a server event
   if (Math.random() < 0.1 / Settings.TPS) {
      playSoundOnEntity("zombie-ambient-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, true);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function onHit(entity: Entity, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Blood pool particle
   createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = transformComponent.position.x + RADIUS * Math.sin(offsetDirection);
      const spawnPositionY = transformComponent.position.y + RADIUS * Math.cos(offsetDirection);
   
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
   }

   playSoundOnEntity("zombie-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
   createBloodParticleFountain(entity, 0.1, 1);

   playSoundOnEntity("zombie-die-1.mp3", 0.4, 1, entity, false);
}