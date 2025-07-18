import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import { createGenericGemParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface GuardianSpikyBallComponentParams {}

interface IntermediateInfo {}

export interface GuardianSpikyBallComponent {}

export const GuardianSpikyBallComponentArray = new ServerComponentArray<GuardianSpikyBallComponent, GuardianSpikyBallComponentParams, IntermediateInfo>(ServerComponentType.guardianSpikyBall, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
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

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/guardian-spiky-ball/guardian-spiky-ball.png")
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): GuardianSpikyBallComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onLoad(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("guardian-spiky-ball-spawn.mp3", 0.4, 1, entity, hitbox, false);
}

function padData(): void {}

function updateFromData(): void {}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   playSoundOnHitbox("guardian-spiky-ball-death.mp3", 0.4, 1, entity, hitbox, false);

   for (let i = 0; i < 10; i++) {
      const offsetMagnitude = 10 * Math.random();

      createGenericGemParticle(hitbox, offsetMagnitude, 0.7, 0.16, 0.7);
   }
}