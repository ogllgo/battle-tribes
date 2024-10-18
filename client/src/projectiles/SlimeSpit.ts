import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import { createPoisonParticle } from "../particles";
import { getEntityRenderInfo } from "../world";

class SlimeSpit extends Entity {
   public onDie(): void {
      for (let i = 0; i < 15; i++) {
         createPoisonParticle(this.id);
      }
   }
}

export default SlimeSpit;