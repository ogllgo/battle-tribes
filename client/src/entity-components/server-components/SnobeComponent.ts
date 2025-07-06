import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams, getEntityRenderInfo } from "../../world";
import { Hitbox } from "../../hitboxes";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { entityChildIsHitbox, TransformComponentArray } from "./TransformComponent";
import { Entity } from "../../../../shared/src/entities";
import { Point, randAngle, randFloat, randInt } from "../../../../shared/src/utils";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain, createHighSnowParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { HealthComponentArray } from "./HealthComponent";
import { RandomSoundComponentArray, updateRandomSoundComponentSounds } from "../client-components/RandomSoundComponent";
import { Settings } from "../../../../shared/src/settings";
import { PacketReader } from "../../../../shared/src/packets";

const AMBIENT_SOUNDS: ReadonlyArray<string> = ["snobe-ambient-1.mp3", "snobe-ambient-2.mp3", "snobe-ambient-3.mp3", "snobe-ambient-4.mp3"];

export interface SnobeComponentParams {
   readonly isDigging: boolean;
   readonly diggingProgress: number;
}

interface IntermediateInfo {}

export interface SnobeComponent {
   isDigging: boolean;
   diggingProgress: number;
}

export const SnobeComponentArray = new ServerComponentArray<SnobeComponent, SnobeComponentParams, IntermediateInfo>(ServerComponentType.snobe, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): SnobeComponentParams {
   const isDigging = reader.readBoolean();
   reader.padOffset(3);

   const diggingProgress = reader.readNumber();

   return {
      isDigging: isDigging,
      diggingProgress: diggingProgress
   };
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      if (hitbox.flags.includes(HitboxFlag.SNOBE_BODY)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            2,
            0,
            getTextureArrayIndex("entities/snobe/body.png")
         );
         renderPart.addTag("tamingComponent:head")
         entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.SNOBE_BUTT)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               1,
               0,
               getTextureArrayIndex("entities/snobe/butt.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.SNOBE_EAR)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               3,
               0,
               getTextureArrayIndex("entities/snobe/ear.png")
            )
         );
      }
   }

   return {};
}

function createComponent(entityParams: EntityParams): SnobeComponent {
   const snobeComponentParams = entityParams.serverComponentParams[ServerComponentType.snobe]!;
   
   return {
      isDigging: snobeComponentParams.isDigging,
      diggingProgress: snobeComponentParams.diggingProgress
   };
}

function getMaxRenderParts(): number {
   return 4;
}

function onTick(snobe: Entity): void {
   const randomSoundComponent = RandomSoundComponentArray.getComponent(snobe);
   updateRandomSoundComponentSounds(randomSoundComponent, 3 * Settings.TPS, 7 * Settings.TPS, AMBIENT_SOUNDS, 0.3);

   const snobeComponent = SnobeComponentArray.getComponent(snobe);
   if (snobeComponent.isDigging && snobeComponent.diggingProgress < 1 && Math.random() < 15 / Settings.TPS) {
      const transformComponent = TransformComponentArray.getComponent(snobe);
      const hitbox = transformComponent.children[0] as Hitbox;

      const position = hitbox.box.position.offset(32 * Math.random(), randAngle());
      createHighSnowParticle(position.x, position.y, randFloat(30, 50));
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, snobe: Entity): void {
   const snobeComponent = SnobeComponentArray.getComponent(snobe);
   snobeComponent.isDigging = reader.readBoolean();
   reader.padOffset(3);

   snobeComponent.diggingProgress = reader.readNumber();
   const opacity = 1 - Math.pow(snobeComponent.diggingProgress, 2);
   const renderInfo = getEntityRenderInfo(snobe);
   for (const renderPart of renderInfo.renderPartsByZIndex) {
      // @HACK
      if (renderPart instanceof TexturedRenderPart) {
         renderPart.opacity = opacity;
      }
   }
}

function onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point): void {
   // @Hack
   const healthComponent = HealthComponentArray.getComponent(entity);
   if (healthComponent.health <= 0) {
      return;
   }

   // Blood pool particles
   for (let i = 0; i < 2; i++) {
      createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
   }
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = hitbox.box.position.calculateAngleBetween(hitPosition);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.position.x + 32 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + 32 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
   }

   playSoundOnHitbox("snobe-hit-" + randInt(1, 3) + ".mp3", 0.2, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   for (let i = 0; i < 3; i++) {
      createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 35);
   }

   createBloodParticleFountain(entity, 0.1, 1.1);

   playSoundOnHitbox("snobe-death-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
}