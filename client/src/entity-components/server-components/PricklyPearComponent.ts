import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { Point, randAngle, randFloat } from "../../../../shared/src/utils";
import { createPricklyPearParticle } from "../../particles";
import { HealthComponentArray } from "./HealthComponent";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface PricklyPearComponentParams {}

interface IntermediateInfo {}

export interface PricklyPearComponent {}

export const PricklyPearComponentArray = new ServerComponentArray<PricklyPearComponent, PricklyPearComponentParams, IntermediateInfo>(ServerComponentType.pricklyPear, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onDie: onDie
});

function createParamsFromData(): PricklyPearComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/prickly-pear/prickly-pear.png")
      )
   );

   return {};
}

function createComponent(): PricklyPearComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}
   
function padData(reader: PacketReader): void {}

function updateFromData(reader: PacketReader): void {}

function onDie(pricklyPear: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(pricklyPear);
   const hitbox = transformComponent.hitboxes[0];

   const healthComponent = HealthComponentArray.getComponent(pricklyPear);
   if (healthComponent.health <= 0) {
      playSoundOnHitbox("prickly-pear-explode.mp3", 0.65, randFloat(0.9, 1.1), pricklyPear, hitbox, false);

      for (let i = 0; i < 7; i++) {
         const offsetDirection = randAngle();
         const offsetMagnitude = randFloat(4, 8);
         const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
         createPricklyPearParticle(x, y, randAngle());
      }
   } else {
      playSoundOnHitbox("prickly-pear-snap.mp3", 0.5, randFloat(0.9, 1.1), pricklyPear, hitbox, false);

   }
}