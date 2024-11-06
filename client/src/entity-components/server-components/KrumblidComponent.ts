import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { HitData } from "../../../../shared/src/client-server-types";
import { EntityID } from "../../../../shared/src/entities";
import { angle, randFloat } from "../../../../shared/src/utils";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";

export interface KrumblidComponentParams {}

interface RenderParts {}

export interface KrumblidComponent {}

export const KrumblidComponentArray = new ServerComponentArray<KrumblidComponent, KrumblidComponentParams, RenderParts>(ServerComponentType.krumblid, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
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

function onHit(entity: EntityID, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
   
   // Blood particles
   for (let i = 0; i < 5; i++) {
      let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = transformComponent.position.x + 32 * Math.sin(offsetDirection);
      const spawnPositionY = transformComponent.position.y + 32 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
   }
}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < 2; i++) {
      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 35);
   }

   createBloodParticleFountain(entity, 0.1, 0.8);
}