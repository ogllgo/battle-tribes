import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams, getCurrentLayer } from "../../world";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { Entity } from "../../../../shared/src/entities";
import { Settings } from "../../../../shared/src/settings";
import { playSound, playSoundOnHitbox } from "../../sound";
import { randFloat, randInt } from "../../../../shared/src/utils";
import Camera from "../../Camera";

export interface InguYetuksnoglurblidokowfleaComponentParams {}

interface IntermediateInfo {}

export interface InguYetuksnoglurblidokowfleaComponent {}

export const InguYetuksnoglurblidokowfleaComponentArray = new ServerComponentArray<InguYetuksnoglurblidokowfleaComponent, InguYetuksnoglurblidokowfleaComponentParams, IntermediateInfo>(ServerComponentType.inguYetuksnoglurblidokowflea, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick
});

export function createInguYetuksnoglurblidokowfleaComponentParams(): InguYetuksnoglurblidokowfleaComponentParams {
   return {};
}

function createParamsFromData(): InguYetuksnoglurblidokowfleaComponentParams {
   return createInguYetuksnoglurblidokowfleaComponentParams();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;

   for (const hitbox of transformComponentParams.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_1)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-1.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_2)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            3,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-2.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_3)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            2,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-3.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_4)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            1,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-4.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_GLURB_SEGMENT)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex("entities/glurb/glurb-middle-segment.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETI_HEAD)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            5,
            0,
            getTextureArrayIndex("entities/yeti/yeti-head.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_BIG)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.8,
            0,
            getTextureArrayIndex("entities/okren/adult/mandible.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_MEDIUM)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            getTextureArrayIndex("entities/okren/juvenile/mandible.png")
         );
         renderInfo.attachRenderPart(renderPart);
      }
   }

   return {};
}

function onTick(inguYetuk: Entity): void {
   // @HACK!!!

   if (Math.random() < 0.6 / Settings.TPS) {
      playSound("cow-ambient-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.4 / Settings.TPS) {
      playSound("cow-hurt-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.3 / Settings.TPS) {
      playSound("cow-die-1.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }


   if (Math.random() < 0.6 / Settings.TPS) {
      playSound("yeti-ambient-" + randInt(1, 6) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.6 / Settings.TPS) {
      playSound("yeti-angry-" + randInt(1, 5) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.5 / Settings.TPS) {
      playSound("yeti-hurt-" + randInt(1, 5) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.3 / Settings.TPS) {
      playSound("yeti-death-" + randInt(1, 2) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }

   if (Math.random() < 2 / Settings.TPS) {
      playSound("glurb-hit.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 1 / Settings.TPS) {
      playSound("glurb-death.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }

   if (Math.random() < 0.8 / Settings.TPS) {
      playSound("tukmok-bone-hit.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 1.2 / Settings.TPS) {
      playSound("tukmok-hit-flesh-" + randInt(1, 4) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 1.2 / Settings.TPS) {
      playSound("tukmok-angry-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.5 / Settings.TPS) {
      playSound("tukmok-death.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }

   if (Math.random() < 0.65 / Settings.TPS) {
      playSound("ingu-serpent-hit.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.5 / Settings.TPS) {
      playSound("ingu-serpent-death.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 1 / Settings.TPS) {
      playSound("ingu-serpent-angry-" + randInt(1, 2) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 1.2 / Settings.TPS) {
      playSound("ingu-serpent-leap.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }


   if (Math.random() < 1.2 / Settings.TPS) {
      playSound("snobe-hit-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 1.2 / Settings.TPS) {
      playSound("snobe-death-" + randInt(1,3) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 1.5 / Settings.TPS) {
      playSound("snobe-ambient-" + randInt(1,4) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }

   if (Math.random() < 1 / Settings.TPS) {
      playSound("krumblid-death.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 1 / Settings.TPS) {
      playSound("krumblid-hit-flesh-" + randInt(1, 2) + ".mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
   if (Math.random() < 1 / Settings.TPS) {
      playSound("krumblid-hit-shell.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }

   if (Math.random() < 0.7 / Settings.TPS) {
      playSound("okren-eye-hit.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }

   if (Math.random() < 1 / Settings.TPS) {
      playSound("dustflea-hit.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }

   if (Math.random() < 2.5 / Settings.TPS) {
      playSound("dustflea-egg-pop.mp3", 0.4, randFloat(0.8, 1.2), Camera.position.copy(), getCurrentLayer());
   }
}

function createComponent(): InguYetuksnoglurblidokowfleaComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 50;
}

function padData(): void {}

function updateFromData(): void {}