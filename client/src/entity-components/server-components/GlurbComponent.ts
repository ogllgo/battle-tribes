import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../ComponentArray";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { attachLightToRenderPart, createLight } from "../../lights";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityLayer } from "../../world";
import { coatSlimeTrails } from "../../rendering/webgl/slime-trail-rendering";

export interface GlurbComponentParams {}

interface RenderParts {}

export interface GlurbComponent {}

export const GlurbComponentArray = new ServerComponentArray<GlurbComponent, GlurbComponentParams, RenderParts>(ServerComponentType.glurb, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick
});

export function createGlurbComponentParams(): GlurbComponentParams {
   return {};
}

function createParamsFromData(): GlurbComponentParams {
   return createGlurbComponentParams();
}

function createRenderParts(renderInfo: EntityRenderInfo, config: EntityConfig<ServerComponentType.transform, never>): RenderParts {
   const transformComponentConfig = config.serverComponents[ServerComponentType.transform];
   for (let i = 0; i < transformComponentConfig.hitboxes.length; i++) {
      const hitbox = transformComponentConfig.hitboxes[i];

      let textureSource: string;
      let lightIntensity: number;
      let lightRadius: number;
      if (hitbox.flags.includes(HitboxFlag.GLURB_HEAD_SEGMENT)) {
         // Head segment
         lightIntensity = 0.35;
         lightRadius = 6;
         textureSource = "entities/glurb/glurb-head-segment.png";
      } else if (!hitbox.flags.includes(HitboxFlag.GLURB_TAIL_SEGMENT)) {
         // Middle segment
         lightIntensity = 0.4;
         lightRadius = 8;
         textureSource = "entities/glurb/glurb-middle-segment.png";
      } else {
         // Tail segment
         lightIntensity = 0.3;
         lightRadius = 4;
         textureSource = "entities/glurb/glurb-tail-segment.png";
      }
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(textureSource)
      );
      renderInfo.attachRenderPart(renderPart);

      // The first (front) segment has 2 eyes
      if (i === 0) {
         for (let j = 0; j < 2; j++) {
            const eyeRenderPart = new TexturedRenderPart(
               renderPart,
               0,
               0.3,
               getTextureArrayIndex("entities/glurb/glurb-eye.png")
            );
            if (j === 1) {
               eyeRenderPart.setFlipX(true);
            }
            eyeRenderPart.offset.x = 16;
            eyeRenderPart.offset.y = 14;
            renderInfo.attachRenderPart(eyeRenderPart);
         }
      }
      
      // Attach light to the render part
      const light = createLight(new Point(0, 0), lightIntensity, 0.8, lightRadius, 1, 0.2, 0.9);
      attachLightToRenderPart(light, renderPart, config.entity, config.layer);
   }

   return {};
}

function createComponent(): GlurbComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}

function onTick(glurb: Entity): void {
   const layer = getEntityLayer(glurb);
   const transformComponent = TransformComponentArray.getComponent(glurb);
   for (const hitbox of transformComponent.hitboxes) {
      coatSlimeTrails(layer, hitbox.box);
   }
}