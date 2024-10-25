import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createGenericGemParticle } from "../../particles";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface GuardianGemFragmentProjectileComponentParams {
   readonly fragmentShape: number;
   readonly gemType: number;
   readonly baseTintMultiplier: number;
}

interface RenderParts {
   readonly renderPart: RenderPart;
}

export interface GuardianGemFragmentProjectileComponent {
   readonly renderPart: RenderPart;
}

const TEXTURE_SOURCES = [
   "entities/guardian-gem-fragment-projectile/fragment-1.png",
   "entities/guardian-gem-fragment-projectile/fragment-2.png",
   "entities/guardian-gem-fragment-projectile/fragment-3.png"
];

export const GuardianGemFragmentProjectileComponentArray = new ServerComponentArray<GuardianGemFragmentProjectileComponent, GuardianGemFragmentProjectileComponentParams, RenderParts>(ServerComponentType.guardianGemFragmentProjectile, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
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

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.guardianGemFragmentProjectile, never>): RenderParts {
   const guardianGemFragmentProjectileComponentParams = entityConfig.serverComponents[ServerComponentType.guardianGemFragmentProjectile];
   
   const renderPart = new TexturedRenderPart(
      null,
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

   renderInfo.attachRenderThing(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(_entityConfig: EntityConfig<never, never>, renderParts: RenderParts): GuardianGemFragmentProjectileComponent {
   return {
      renderPart: renderParts.renderPart
   };
}

function onDie(entity: EntityID): void {
   const guardianGemFragmentProjectileComponent = GuardianGemFragmentProjectileComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 3; i++) {
      createGenericGemParticle(transformComponent, 4, guardianGemFragmentProjectileComponent.renderPart.tintR, guardianGemFragmentProjectileComponent.renderPart.tintG, guardianGemFragmentProjectileComponent.renderPart.tintB);
   }

   if (Math.random() < 0.5) {
      playSound("guardian-gem-fragment-death.mp3", 0.3, 1, transformComponent.position);
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}