import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { randAngle, randFloat } from "../../../../shared/src/utils";
import Board from "../../Board";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import Particle from "../../Particle";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { addMonocolourParticleToBufferContainer, ParticleColour, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { entityChildIsHitbox, TransformComponentArray } from "./TransformComponent";

const ICE_SPECK_COLOUR: ParticleColour = [140/255, 143/255, 207/255];
const SIZE = 80;

export interface InguSerpentComponentParams {}

interface IntermediateInfo {}

export interface InguSerpentComponent {}

export const InguSerpentComponentArray = new ServerComponentArray<InguSerpentComponent, InguSerpentComponentParams, IntermediateInfo>(ServerComponentType.inguSerpent, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): InguSerpentComponentParams {
   return {};
}

const createIceSpeckProjectile = (hitbox: Hitbox): void => {
   const spawnOffsetDirection = randAngle();
   const spawnPosition = hitbox.box.position.offset(SIZE / 2 * Math.random(), spawnOffsetDirection);

   const velocityMagnitude = randFloat(60, 150);
   const velocityDirection = spawnOffsetDirection + randFloat(-0.8, 0.8);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
   const lifetime = randFloat(0.28, 0.78);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / particle.lifetime, 2);
   }

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4,
      4,
      spawnPosition.x, spawnPosition.y,
      velocityX, velocityY,
      0, 0,
      0,
      velocityDirection,
      0,
      0,
      0,
      ICE_SPECK_COLOUR[0], ICE_SPECK_COLOUR[1], ICE_SPECK_COLOUR[2]
   );
   Board.highMonocolourParticles.push(particle);
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      if (hitbox.flags.includes(HitboxFlag.INGU_SERPENT_HEAD)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            3,
            0,
            getTextureArrayIndex("entities/ingu-serpent/head.png")
         );
         renderPart.addTag("tamingComponent:head");
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.INGU_SERPENT_BODY_1)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               2,
               0,
               getTextureArrayIndex("entities/ingu-serpent/body-1.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.INGU_SERPENT_BODY_2)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               1,
               0,
               getTextureArrayIndex("entities/ingu-serpent/body-2.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.INGU_SERPENT_TAIL)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               0,
               0,
               getTextureArrayIndex("entities/ingu-serpent/tail.png")
            )
         );
      }
   }

   return {};
}

function createComponent(): InguSerpentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 4;
}

function padData(): void {}

function updateFromData(): void {}

function onHit(serpent: Entity, hitbox: Hitbox): void {
   // Create ice particles on hit
   for (let i = 0; i < 10; i++) {
      createIceSpeckProjectile(hitbox);
   }

   playSoundOnHitbox("ingu-serpent-hit.mp3", 0.4, randFloat(0.88, 1.12) * 1.3, serpent, hitbox, false);
}

function onDie(serpent: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(serpent);
   const hitbox = transformComponent.children[0] as Hitbox;

   for (const hitbox of transformComponent.children) {
      if (entityChildIsHitbox(hitbox)) {
         for (let i = 0; i < 15; i++) {
            createIceSpeckProjectile(hitbox);
         }
      }
   }
   
   playSoundOnHitbox("ingu-serpent-death.mp3", 0.3, 1, serpent, hitbox, false);
}