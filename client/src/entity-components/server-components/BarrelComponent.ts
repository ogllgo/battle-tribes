import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { playBuildingHitSound, playSoundOnEntity } from "../../sound";

export interface BarrelComponentParams {}

interface RenderParts {}

export interface BarrelComponent {}

export const BarrelComponentArray = new ServerComponentArray<BarrelComponent, BarrelComponentParams, RenderParts>(ServerComponentType.barrel, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
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

function onHit(entity: Entity): void {
   playBuildingHitSound(entity);
}

function onDie(entity: Entity): void {
   playSoundOnEntity("building-destroy-1.mp3", 0.4, 1, entity, false);
}