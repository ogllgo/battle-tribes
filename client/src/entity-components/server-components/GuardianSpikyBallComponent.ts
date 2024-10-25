import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { Light, addLight, attachLightToEntity } from "../../lights";
import { createGenericGemParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface GuardianSpikyBallComponentParams {}

export interface GuardianSpikyBallComponent {}

export const GuardianSpikyBallComponentArray = new ServerComponentArray<GuardianSpikyBallComponent, GuardianSpikyBallComponentParams, never>(ServerComponentType.guardianSpikyBall, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onLoad: onLoad,
   padData: padData,
   updateFromData: updateFromData,
   onDie: onDie
});

function createParamsFromData(): GuardianSpikyBallComponentParams {
   return {};
}

function createComponent(): GuardianSpikyBallComponent {
   return {};
}

function onLoad(entity: EntityID): void {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex("entities/guardian-spiky-ball/guardian-spiky-ball.png")
   );

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderThing(renderPart);

   const light: Light = {
      offset: new Point(0, 0),
      intensity: 0.4,
      strength: 0.3,
      radius: 20,
      r: 0.9,
      g: 0.2,
      b: 0.9
   };
   const lightID = addLight(light);
   attachLightToEntity(lightID, entity);

   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("guardian-spiky-ball-spawn.mp3", 0.4, 1, transformComponent.position);
}

function padData(): void {}

function updateFromData(): void {}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("guardian-spiky-ball-death.mp3", 0.4, 1, transformComponent.position);

   for (let i = 0; i < 10; i++) {
      const offsetMagnitude = 10 * Math.random();

      createGenericGemParticle(transformComponent, offsetMagnitude, 0.7, 0.16, 0.7);
   }
}