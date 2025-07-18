import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface BarrelComponentParams {}

interface IntermediateInfo {}

export interface BarrelComponent {}

export const BarrelComponentArray = new ServerComponentArray<BarrelComponent, BarrelComponentParams, IntermediateInfo>(ServerComponentType.barrel, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/barrel/barrel.png")
      )
   );

   return {};
}

export function createBarrelComponentParams(): BarrelComponentParams {
   return {};
}

function createParamsFromData(): BarrelComponentParams {
   return createBarrelComponentParams();
}

function createComponent(): BarrelComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playBuildingHitSound(entity, hitbox);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("building-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
}