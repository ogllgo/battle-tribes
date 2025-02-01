import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { HitData } from "../../../../shared/src/client-server-types";
import { Entity } from "../../../../shared/src/entities";
import { angle, randFloat, randInt } from "../../../../shared/src/utils";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain, createKrumblidChitinParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnEntity } from "../../sound";

export interface KrumblidComponentParams {}

interface RenderParts {}

export interface KrumblidComponent {}

export const KrumblidComponentArray = new ServerComponentArray<KrumblidComponent, KrumblidComponentParams, RenderParts>(ServerComponentType.krumblid, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): KrumblidComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/krumblid/krumblid.png")
      )
   );

   return {};
}

function createComponent(): KrumblidComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}

function onHit(krumblid: Entity, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   
   createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
   
   // Blood particles
   for (let i = 0; i < 5; i++) {
      let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = transformComponent.position.x + 32 * Math.sin(offsetDirection);
      const spawnPositionY = transformComponent.position.y + 32 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
   }

   playSoundOnEntity("krumblid-hit-shell.mp3", 0.6, randFloat(0.9, 1.1), krumblid, false);
   playSoundOnEntity("krumblid-hit-flesh-" + randInt(1, 2) + ".mp3", 0.6, randFloat(0.9, 1.1), krumblid, false);
}

function onDie(krumblid: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   for (let i = 0; i < 2; i++) {
      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 35);
   }

   createBloodParticleFountain(krumblid, 0.1, 0.8);

   for (let i = 0; i < 10; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + 20 * Math.sin(offsetDirection);
      const spawnPositionY = transformComponent.position.y + 20 * Math.cos(offsetDirection);
      createKrumblidChitinParticle(spawnPositionX, spawnPositionY);
   }

   playSoundOnEntity("krumblid-death.mp3", 0.6, randFloat(0.9, 1.1), krumblid, false);
}