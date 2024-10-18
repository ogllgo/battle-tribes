import { angle, randFloat } from "battletribes-shared/utils";
import { HitData } from "battletribes-shared/client-server-types";
import { BloodParticleSize, createBlueBloodParticle, createBlueBloodParticleFountain, createBlueBloodPoolParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { FROZEN_YETI_HEAD_DISTANCE } from "../entity-components/server-components/FrozenYetiComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";

class FrozenYeti extends Entity {
   private static readonly SIZE = 152;

   protected onHit(hitData: HitData): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

      // Blood pool particle
      createBlueBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, FrozenYeti.SIZE / 2);
      
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = transformComponent.position.x + FrozenYeti.SIZE / 2 * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + FrozenYeti.SIZE / 2 * Math.cos(offsetDirection);
         createBlueBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      
      for (let i = 0; i < 4; i++) {
         createBlueBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, FrozenYeti.SIZE / 2);
      }

      createBlueBloodParticleFountain(this, 0.15, 1.4);
   }
}

export default FrozenYeti;