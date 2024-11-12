import { angle, lerp, randFloat, randItem } from "battletribes-shared/utils";
import { VisualRenderPart } from "../../render-parts/render-parts";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createSnowParticle, createWhiteSmokeParticle } from "../../particles";
import { playSound } from "../../sound";
import { RandomSoundComponentArray, updateRandomSoundComponentSounds } from "../client-components/RandomSoundComponent";
import { Settings } from "../../../../shared/src/settings";
import { TransformComponentArray } from "./TransformComponent";
import { Entity } from "../../../../shared/src/entities";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { EntityConfig } from "../ComponentArray";
import { HitData } from "../../../../shared/src/client-server-types";

const enum Vars {
   SNOW_THROW_OFFSET = 64
}

export interface YetiComponentParams {
   readonly attackProgress: number;
}

interface RenderParts {
   readonly pawRenderParts: ReadonlyArray<VisualRenderPart>;
}

export interface YetiComponent {
   lastAttackProgress: number;
   attackProgress: number;

   readonly pawRenderParts: ReadonlyArray<VisualRenderPart>;
}

export const YETI_SIZE = 128;

const BLOOD_POOL_SIZE = 30;

const YETI_PAW_START_ANGLE = Math.PI/3;
const YETI_PAW_END_ANGLE = Math.PI/6;

const AMBIENT_SOUNDS: ReadonlyArray<string> = ["yeti-ambient-1.mp3", "yeti-ambient-2.mp3", "yeti-ambient-3.mp3", "yeti-ambient-4.mp3", "yeti-ambient-5.mp3", "yeti-ambient-6.mp3"];
const ANGRY_SOUNDS: ReadonlyArray<string> = ["yeti-angry-1.mp3", "yeti-angry-2.mp3", "yeti-angry-3.mp3", "yeti-angry-4.mp3", "yeti-angry-5.mp3"];
const HURT_SOUNDS: ReadonlyArray<string> = ["yeti-hurt-1.mp3", "yeti-hurt-2.mp3", "yeti-hurt-3.mp3", "yeti-hurt-4.mp3", "yeti-hurt-5.mp3"];
const DEATH_SOUNDS: ReadonlyArray<string> = ["yeti-death-1.mp3", "yeti-death-2.mp3"];

export const YetiComponentArray = new ServerComponentArray<YetiComponent, YetiComponentParams, RenderParts>(ServerComponentType.yeti, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   onHit: onHit,
   onDie: onDie,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): YetiComponentParams {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   const attackProgress = reader.readNumber();

   return {
      attackProgress: attackProgress
   };
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("entities/yeti/yeti.png")
      )
   );

   const pawRenderParts = new Array<VisualRenderPart>();
   for (let i = 0; i < 2; i++) {
      const paw = new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/yeti/yeti-paw.png")
      );
      pawRenderParts.push(paw);
      renderInfo.attachRenderPart(paw);
   }

   return {
      pawRenderParts: pawRenderParts
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.yeti, never>, renderParts: RenderParts): YetiComponent {
   const yetiComponentParams = entityConfig.serverComponents[ServerComponentType.yeti];
   
   return {
      lastAttackProgress: yetiComponentParams.attackProgress,
      attackProgress: yetiComponentParams.attackProgress,
      pawRenderParts: renderParts.pawRenderParts
   };
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const yetiComponent = YetiComponentArray.getComponent(entity);

   // Create snow impact particles when the Yeti does a throw attack
   if (yetiComponent.attackProgress === 0 && yetiComponent.lastAttackProgress !== 0) {
      const offsetMagnitude = Vars.SNOW_THROW_OFFSET + 20;
      const impactPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(transformComponent.rotation);
      const impactPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(transformComponent.rotation);
      
      for (let i = 0; i < 30; i++) {
         const offsetMagnitude = randFloat(0, 20);
         const offsetDirection = 2 * Math.PI * Math.random();
         const positionX = impactPositionX + offsetMagnitude * Math.sin(offsetDirection);
         const positionY = impactPositionY + offsetMagnitude * Math.cos(offsetDirection);
         
         createSnowParticle(positionX, positionY, randFloat(40, 100));
      }

      // White smoke particles
      for (let i = 0; i < 10; i++) {
         const spawnPositionX = impactPositionX;
         const spawnPositionY = impactPositionY;
         createWhiteSmokeParticle(spawnPositionX, spawnPositionY, 1);
      }
   }
   yetiComponent.lastAttackProgress = yetiComponent.attackProgress;
}

function onHit(entity: Entity, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   playSound(randItem(HURT_SOUNDS), 0.7, 1, transformComponent.position.copy());

   // Blood pool particle
   createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, BLOOD_POOL_SIZE);
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = transformComponent.position.x + YETI_SIZE / 2 * Math.sin(offsetDirection);
      const spawnPositionY = transformComponent.position.y + YETI_SIZE / 2 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound(randItem(DEATH_SOUNDS), 0.7, 1, transformComponent.position.copy());

   createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, BLOOD_POOL_SIZE);

   createBloodParticleFountain(entity, 0.15, 1.6);
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

const updatePaws = (yetiComponent: YetiComponent): void => {
   let attackProgress = yetiComponent.attackProgress;
   attackProgress = Math.pow(attackProgress, 0.75);
   
   for (let i = 0; i < 2; i++) {
      const paw = yetiComponent.pawRenderParts[i];

      const angle = lerp(YETI_PAW_END_ANGLE, YETI_PAW_START_ANGLE, attackProgress) * (i === 0 ? 1 : -1);
      paw.offset.x = YETI_SIZE/2 * Math.sin(angle);
      paw.offset.y = YETI_SIZE/2 * Math.cos(angle);
   }
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const yetiComponent = YetiComponentArray.getComponent(entity);
   
   const isAttacking = reader.readBoolean();
   reader.padOffset(3);
   yetiComponent.attackProgress = reader.readNumber();
   updatePaws(yetiComponent);

   const randomSoundComponent = RandomSoundComponentArray.getComponent(entity);
   if (isAttacking) {
      updateRandomSoundComponentSounds(randomSoundComponent, 3.5 * Settings.TPS, 5.5 * Settings.TPS, ANGRY_SOUNDS, 0.7);
   } else {
      updateRandomSoundComponentSounds(randomSoundComponent, 7 * Settings.TPS, 11 * Settings.TPS, AMBIENT_SOUNDS, 0.7);
   }
}