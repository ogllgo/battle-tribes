import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { randFloat } from "../../../../shared/src/utils";

export interface InguYetukLaserComponentParams {}

interface IntermediateInfo {}

export interface InguYetukLaserComponent {}

export const InguYetukLaserComponentArray = new ServerComponentArray<InguYetukLaserComponent, InguYetukLaserComponentParams, IntermediateInfo>(ServerComponentType.inguYetukLaser, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onSpawn: onSpawn,
   padData: padData,
   updateFromData: updateFromData
});

export function createInguYetukLaserComponentParams(): InguYetukLaserComponentParams {
   return {};
}

function createParamsFromData(): InguYetukLaserComponentParams {
   return createInguYetukLaserComponentParams();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/ingu-yetuk-laser/laser.png")
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): InguYetukLaserComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 50;
}

function onSpawn(laser: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(laser);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("lazur.mp3", 0.4, randFloat(0.8, 1.2), laser, hitbox, false);
}

function padData(): void {}

function updateFromData(): void {}