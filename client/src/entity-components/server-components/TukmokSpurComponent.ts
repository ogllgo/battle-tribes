import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface TukmokSpurComponentParams {}

interface IntermediateInfo {}

export interface TukmokSpurComponent {}

export const TukmokSpurComponentArray = new ServerComponentArray<TukmokSpurComponent, TukmokSpurComponentParams, IntermediateInfo>(ServerComponentType.tukmokSpur, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit
});

function createParamsFromData(): TukmokSpurComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   let textureSource: string;
   if (hitbox.flags.includes(HitboxFlag.TUKMOK_SPUR_HEAD)) {
      textureSource = "entities/tukmok-spur/spur-head.png";
   } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_SPUR_SHOULDER_LEFT_FRONT)) {
      textureSource = "entities/tukmok-spur/spur-shoulder-left-front.png";
   } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_SPUR_SHOULDER_LEFT_BACK)) {
      textureSource = "entities/tukmok-spur/spur-shoulder-left-back.png";
   } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_SPUR_SHOULDER_RIGHT_FRONT)) {
      textureSource = "entities/tukmok-spur/spur-shoulder-right-front.png";
   } else {
      textureSource = "entities/tukmok-spur/spur-shoulder-right-back.png";
   }
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(textureSource)
      )
   );

   return {};
}

function createComponent(): TukmokSpurComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("tukmok-bone-hit.mp3", 0.4, randFloat(0.92, 1.08), entity, hitbox, false);
}