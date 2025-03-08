import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { Point, randItem } from "battletribes-shared/utils";
import { createRockSpeckParticle } from "../../particles";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { Light, createLight } from "../../lights";
import { playSoundOnHitbox, ROCK_HIT_SOUNDS } from "../../sound";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { TransformComponentArray } from "./TransformComponent";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { EntityIntermediateInfo, EntityParams } from "../../world";

enum GolemRockSize {
   massive,
   small,
   medium,
   large,
   tiny
}

export interface GolemComponentParams {
   readonly wakeProgress: number;
}

interface IntermediateInfo {
   readonly rockRenderParts: Array<VisualRenderPart>;
   readonly eyeRenderParts: Array<VisualRenderPart>;
   readonly eyeLights: Array<Light>;
}

export interface GolemComponent {
   wakeProgress: number;
   
   rockRenderParts: Array<VisualRenderPart>;
   readonly eyeRenderParts: Array<VisualRenderPart>;
   readonly eyeLights: Array<Light>;
}

const ANGRY_SOUND_INTERVAL_TICKS = Settings.TPS * 3;

const getHitboxSize = (hitboxBox: CircularBox): GolemRockSize => {
   if (Math.abs(hitboxBox.radius - 36) < 0.01) {
      return GolemRockSize.massive;
   }
   if (Math.abs(hitboxBox.radius - 32) < 0.01) {
      return GolemRockSize.large;
   }
   if (Math.abs(hitboxBox.radius - 26) < 0.01) {
      return GolemRockSize.medium;
   }
   if (Math.abs(hitboxBox.radius - 12) < 0.01) {
      return GolemRockSize.tiny;
   }
   return GolemRockSize.small;
}

const getTextureSource = (size: GolemRockSize): string => {
   switch (size) {
      case GolemRockSize.massive: {
         return "entities/golem/golem-body-massive.png";
      }
      case GolemRockSize.large: {
         return "entities/golem/golem-body-large.png";
      }
      case GolemRockSize.medium: {
         return "entities/golem/golem-body-medium.png";
      }
      case GolemRockSize.small: {
         return "entities/golem/golem-body-small.png";
      }
      case GolemRockSize.tiny: {
         return "entities/golem/golem-body-tiny.png";
      }
   }
}

const getZIndex = (size: GolemRockSize): number => {
   switch (size) {
      case GolemRockSize.massive: {
         return 5.5;
      }
      case GolemRockSize.large: {
         return 0.1;
      }
      case GolemRockSize.medium:
      case GolemRockSize.small: {
         return Math.random() * 4.5 + 0.5;
      }
      case GolemRockSize.tiny: {
         return 0;
      }
   }
}

export const GolemComponentArray = new ServerComponentArray<GolemComponent, GolemComponentParams, IntermediateInfo>(ServerComponentType.golem, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit
});

function createParamsFromData(reader: PacketReader): GolemComponentParams {
   const wakeProgress = reader.readNumber();
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

   return {
      wakeProgress: wakeProgress
   };
}

function populateIntermediateInfo(intermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   
   const rockRenderParts = new Array<VisualRenderPart>();
   const eyeRenderParts = new Array<VisualRenderPart>();
   const eyeLights = new Array<Light>();
   
   // Add new rocks
   for (let i = 0; i < transformComponentParams.hitboxes.length; i++) {
      const hitbox = transformComponentParams.hitboxes[i];

      const box = hitbox.box as CircularBox;
      const size = getHitboxSize(box);

      const renderPart = new TexturedRenderPart(
         hitbox,
         getZIndex(size),
         2 * Math.PI * Math.random(),
         getTextureArrayIndex(getTextureSource(size))
      );
      intermediateInfo.renderInfo.attachRenderPart(renderPart);
      rockRenderParts.push(renderPart);

      if (size === GolemRockSize.large) {
         for (let i = 0; i < 2; i++) {
            const eyeRenderPart = new TexturedRenderPart(
               renderPart,
               6,
               0,
               getTextureArrayIndex("entities/golem/eye.png")
            );
            eyeRenderPart.opacity = 0;
            eyeRenderPart.offset.x = 20 * (i === 0 ? -1 : 1);
            eyeRenderPart.offset.y = 17;
            eyeRenderPart.inheritParentRotation = false;
            intermediateInfo.renderInfo.attachRenderPart(eyeRenderPart);
            eyeRenderParts.push(eyeRenderPart);

            // Create eye light
            const light = createLight(
               new Point(0, 0),
               0,
               0.5,
               0.15,
               0.75,
               0,
               0
            );
            eyeLights.push(light);
            intermediateInfo.lights.push({
               light: light,
               attachedRenderPart: eyeRenderPart
            });
         }
      }
   }

   return {
      rockRenderParts: rockRenderParts,
      eyeRenderParts: eyeRenderParts,
      eyeLights: eyeLights
   };
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): GolemComponent {
   return {
      wakeProgress: entityParams.serverComponentParams[ServerComponentType.golem]!.wakeProgress,
      rockRenderParts: intermediateInfo.rockRenderParts,
      eyeRenderParts: intermediateInfo.eyeRenderParts,
      eyeLights: intermediateInfo.eyeLights
   };
}

function getMaxRenderParts(entityParams: EntityParams): number {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   
   let maxRenderParts = 0;
   for (const hitbox of transformComponentParams.hitboxes) {
      maxRenderParts++;

      const size = getHitboxSize(hitbox.box as CircularBox);
      if (size === GolemRockSize.large) {
         maxRenderParts += 2;
      }
   }
   
   return maxRenderParts;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const golemComponent = GolemComponentArray.getComponent(entity);

   if (golemComponent.wakeProgress > 0 && golemComponent.wakeProgress < 1) {
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         const hitbox = transformComponent.hitboxes[i];
         const box = hitbox.box as CircularBox;

         const offsetDirection = 2 * Math.PI * Math.random();
         const x = box.position.x + box.radius * Math.sin(offsetDirection);
         const y = box.position.y + box.radius * Math.cos(offsetDirection);
         createRockSpeckParticle(x, y, 0, hitbox.velocity.x, hitbox.velocity.y, ParticleRenderLayer.low);
      }
   } else if (golemComponent.wakeProgress === 1) {
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         if (Math.random() >= 6 / Settings.TPS) {
            continue;
         }

         const hitbox = transformComponent.hitboxes[i];
         const box = hitbox.box as CircularBox;

         const offsetDirection = 2 * Math.PI * Math.random();
         const x = box.position.x + box.radius * Math.sin(offsetDirection);
         const y = box.position.y + box.radius * Math.cos(offsetDirection);
         createRockSpeckParticle(x, y, 0, hitbox.velocity.x, hitbox.velocity.y, ParticleRenderLayer.low);
      }
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const golemComponent = GolemComponentArray.getComponent(entity);
   
   const wakeProgress = reader.readNumber();
   const ticksAwake = reader.readNumber();
   const isAwake = reader.readBoolean();
   reader.padOffset(3);

   const transformComponent = TransformComponentArray.getComponent(entity);
   
   if (isAwake && ticksAwake % ANGRY_SOUND_INTERVAL_TICKS === 0) {
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("golem-angry.mp3", 0.4, 1, hitbox, true);
   }
   
   golemComponent.wakeProgress = wakeProgress;

   // @CLEANUP
   const shakeAmount = golemComponent.wakeProgress > 0 && golemComponent.wakeProgress < 1 ? 1 : 0;
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      const box = hitbox.box;
      const renderPart = golemComponent.rockRenderParts[i];

      // renderPart.offset.x = box.offset.x;
      // renderPart.offset.y = box.offset.y;
      renderPart.shakeAmount = shakeAmount;
   }

   for (let i = 0; i < 2; i++) {
      golemComponent.eyeRenderParts[i].opacity = golemComponent.wakeProgress;
      golemComponent.eyeLights[i].intensity = golemComponent.wakeProgress;
   }
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox(randItem(ROCK_HIT_SOUNDS), 0.3, 1, hitbox, false);
}