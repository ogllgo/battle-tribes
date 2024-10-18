import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";

class TribeTotem extends Entity {
   public static readonly SIZE = 120;

   constructor(id: number) {
      super(id);

      const renderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex(`entities/tribe-totem/tribe-totem.png`)
      );

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(renderPart);
   }
}

export default TribeTotem;