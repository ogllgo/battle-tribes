import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface TumbleweedDeadComponentParams {}

interface IntermediateInfo {}

export interface TumbleweedDeadComponent {}

export const TumbleweedDeadComponentArray = new ServerComponentArray<TumbleweedDeadComponent, TumbleweedDeadComponentParams, IntermediateInfo>(ServerComponentType.tumbleweedDead, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): TumbleweedDeadComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/tumbleweed-dead/tumbleweed-dead.png")
   );
   renderPart.tintR = randFloat(-0.03, 0.03);
   renderPart.tintG = randFloat(-0.03, 0.03);
   renderPart.tintB = randFloat(-0.03, 0.03);
   renderInfo.attachRenderPart(renderPart)

   return {
      renderPart: renderPart
   };
}

function createComponent(): TumbleweedDeadComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("desert-plant-hit.mp3", randFloat(0.375, 0.425), randFloat(0.85, 1.15), entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   playSoundOnHitbox("desert-plant-hit.mp3", randFloat(0.375, 0.425), randFloat(0.85, 1.15), entity, hitbox, false);
}