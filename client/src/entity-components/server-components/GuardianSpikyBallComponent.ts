import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { attachLightToRenderPart, createLight } from "../../lights";
import { createGenericGemParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnEntity } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface GuardianSpikyBallComponentParams {}

interface RenderParts {}

export interface GuardianSpikyBallComponent {}

export const GuardianSpikyBallComponentArray = new ServerComponentArray<GuardianSpikyBallComponent, GuardianSpikyBallComponentParams, RenderParts>(ServerComponentType.guardianSpikyBall, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onLoad: onLoad,
   padData: padData,
   updateFromData: updateFromData,
   onDie: onDie
});

function createParamsFromData(): GuardianSpikyBallComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<never, never>): RenderParts {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex("entities/guardian-spiky-ball/guardian-spiky-ball.png")
   );
   renderInfo.attachRenderPart(renderPart);

   const light = createLight(
      new Point(0, 0),
      0.4,
      0.3,
      20,
      0.9,
      0.2,
      0.9
   );
   attachLightToRenderPart(light, renderPart, entityConfig.entity, entityConfig.layer);

   return {};
}

function createComponent(): GuardianSpikyBallComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onLoad(entity: Entity): void {
   playSoundOnEntity("guardian-spiky-ball-spawn.mp3", 0.4, 1, entity, false);
}

function padData(): void {}

function updateFromData(): void {}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSoundOnEntity("guardian-spiky-ball-death.mp3", 0.4, 1, entity, false);

   for (let i = 0; i < 10; i++) {
      const offsetMagnitude = 10 * Math.random();

      createGenericGemParticle(transformComponent, offsetMagnitude, 0.7, 0.16, 0.7);
   }
}