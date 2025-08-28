import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import { createGenericGemParticle } from "../../particles";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface GuardianGemFragmentProjectileComponentParams {
   readonly fragmentShape: number;
   readonly gemType: number;
   readonly baseTintMultiplier: number;
}

interface IntermediateInfo {
   readonly renderPart: VisualRenderPart;
}

export interface GuardianGemFragmentProjectileComponent {
   readonly renderPart: VisualRenderPart;
}

const TEXTURE_SOURCES = [
   "entities/guardian-gem-fragment-projectile/fragment-1.png",
   "entities/guardian-gem-fragment-projectile/fragment-2.png",
   "entities/guardian-gem-fragment-projectile/fragment-3.png"
];

export const GuardianGemFragmentProjectileComponentArray = new ServerComponentArray<GuardianGemFragmentProjectileComponent, GuardianGemFragmentProjectileComponentParams, IntermediateInfo>(ServerComponentType.guardianGemFragmentProjectile, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onDie: onDie,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): GuardianGemFragmentProjectileComponentParams {
   const fragmentShape = reader.readNumber();
   const gemType = reader.readNumber();
   const baseTintMultiplier = reader.readNumber();

   return {
      fragmentShape: fragmentShape,
      gemType: gemType,
      baseTintMultiplier: baseTintMultiplier
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const guardianGemFragmentProjectileComponentParams = entityParams.serverComponentParams[ServerComponentType.guardianGemFragmentProjectile]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(TEXTURE_SOURCES[guardianGemFragmentProjectileComponentParams.fragmentShape])
   );

   // Flip half of them
   if (Math.random() < 0.5) {
      renderPart.setFlipX(true);
   }

   const tintMultiplier = 0.85 * guardianGemFragmentProjectileComponentParams.baseTintMultiplier;
   switch (guardianGemFragmentProjectileComponentParams.gemType) {
      // Ruby
      case 0: {
         renderPart.tintR = tintMultiplier;
         break;
      }
      // Emerald
      case 1: {
         renderPart.tintG = tintMultiplier;
         break;
      }
      // Amethyst
      case 2: {
         renderPart.tintR = 0.9 * tintMultiplier;
         renderPart.tintG = 0.2 * tintMultiplier;
         renderPart.tintB = 0.9 * tintMultiplier;
         break;
      }
   }

   renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(_entityParams: EntityParams, intermediateInfo: IntermediateInfo): GuardianGemFragmentProjectileComponent {
   return {
      renderPart: intermediateInfo.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onDie(entity: Entity): void {
   const guardianGemFragmentProjectileComponent = GuardianGemFragmentProjectileComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   for (let i = 0; i < 3; i++) {
      createGenericGemParticle(hitbox, 4, guardianGemFragmentProjectileComponent.renderPart.tintR, guardianGemFragmentProjectileComponent.renderPart.tintG, guardianGemFragmentProjectileComponent.renderPart.tintB);
   }

   if (Math.random() < 0.5) {
      playSoundOnHitbox("guardian-gem-fragment-death.mp3", 0.3, 1, entity, hitbox, false);
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}