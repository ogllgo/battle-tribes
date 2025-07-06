import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { Entity } from "../../../../shared/src/entities";
import { randAngle, randFloat } from "../../../../shared/src/utils";
import { createPricklyPearParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { HealthComponentArray } from "./HealthComponent";

export interface PricklyPearFragmentProjectileComponentParams {
   readonly variant: number;
}

interface IntermediateInfo {}

export interface PricklyPearFragmentProjectileComponent {}

export const PricklyPearFragmentProjectileComponentArray = new ServerComponentArray<PricklyPearFragmentProjectileComponent, PricklyPearFragmentProjectileComponentParams, IntermediateInfo>(ServerComponentType.pricklyPearFragmentProjectile, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): PricklyPearFragmentProjectileComponentParams {
   const variant = reader.readNumber();
   return {
      variant: variant
   };
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   const pricklyPearFragmentProjectileComponentParams = entityParams.serverComponentParams[ServerComponentType.pricklyPearFragmentProjectile]!;

   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/prickly-pear-fragment-projectile/fragment-" + (pricklyPearFragmentProjectileComponentParams.variant + 1) + ".png")
      )
   );

   return {};
}

function createComponent(): PricklyPearFragmentProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   padData(reader);
}

function onDie(fragment: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(fragment);
   const hitbox = transformComponent.children[0] as Hitbox;

   playSoundOnHitbox("prickly-pear-fragment-projectile-explode.mp3", 0.4, randFloat(0.9, 1.1), fragment, hitbox, false);
   
   for (let i = 0; i < 4; i++) {
      const offsetDirection = randAngle();
      const offsetMagnitude = randFloat(4, 8);
      const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
      createPricklyPearParticle(x, y, randAngle());
   }
}