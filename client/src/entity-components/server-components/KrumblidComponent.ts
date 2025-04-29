import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { HitData } from "../../../../shared/src/client-server-types";
import { Entity } from "../../../../shared/src/entities";
import { angle, randFloat, randInt } from "../../../../shared/src/utils";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain, createKrumblidChitinParticle } from "../../particles";
import { entityChildIsHitbox, TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { HealthComponentArray } from "./HealthComponent";

export interface KrumblidComponentParams {}

interface IntermediateInfo {}

export interface KrumblidComponent {}

export const KrumblidComponentArray = new ServerComponentArray<KrumblidComponent, KrumblidComponentParams, IntermediateInfo>(ServerComponentType.krumblid, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): KrumblidComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      if (hitbox.flags.includes(HitboxFlag.KRUMBLID_BODY)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               1,
               0,
               getTextureArrayIndex("entities/krumblid/krumblid.png")
            )
         );
      } else {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               0,
               0,
               getTextureArrayIndex("entities/krumblid/mandible.png")
            )
         );
      }
   }

   return {};
}

function createComponent(): KrumblidComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

function padData(): void {}

function updateFromData(): void {}

function onHit(krumblid: Entity, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.children[0] as Hitbox;
   
   createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
   
   // Blood particles
   for (let i = 0; i < 5; i++) {
      let offsetDirection = angle(hitData.hitPosition[0] - hitbox.box.position.x, hitData.hitPosition[1] - hitbox.box.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.position.x + 32 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + 32 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
   }

   playSoundOnHitbox("krumblid-hit-shell.mp3", 0.6, randFloat(0.9, 1.1), krumblid, hitbox, false);
   playSoundOnHitbox("krumblid-hit-flesh-" + randInt(1, 2) + ".mp3", 0.6, randFloat(0.9, 1.1), krumblid, hitbox, false);
}

function onDie(krumblid: Entity): void {
   const healthComponent = HealthComponentArray.getComponent(krumblid);
   if (healthComponent.health > 0) {
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.children[0] as Hitbox;

   for (let i = 0; i < 2; i++) {
      createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 35);
   }

   createBloodParticleFountain(krumblid, 0.1, 0.8);

   for (let i = 0; i < 10; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = hitbox.box.position.x + 20 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + 20 * Math.cos(offsetDirection);
      createKrumblidChitinParticle(spawnPositionX, spawnPositionY);
   }

   playSoundOnHitbox("krumblid-death.mp3", 0.6, randFloat(0.9, 1.1), krumblid, hitbox, false);
}