import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface SpearProjectileComponentParams {}

interface IntermediateInfo {}

export interface SpearProjectileComponent {}

export const SpearProjectileComponentArray = new ServerComponentArray<SpearProjectileComponent, SpearProjectileComponentParams, IntermediateInfo>(ServerComponentType.spearProjectile, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onSpawn: onSpawn,
   padData: padData,
   updateFromData: updateFromData,
   onDie: onDie
});

function createParamsFromData(): SpearProjectileComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponent = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponent.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         // @HACK
         getTextureArrayIndex("items/misc/ivory-spear.png")
      )
   );

   return {};
}

function createComponent(): SpearProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onSpawn(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("spear-throw.mp3", 0.4, 1, entity, hitbox, false);
}

function padData(): void {}

function updateFromData(): void {}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("spear-hit.mp3", 0.4, 1, entity, hitbox, false);
}