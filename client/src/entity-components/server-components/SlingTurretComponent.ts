import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";

export interface SlingTurretComponentParams {}

interface RenderParts {}

export interface SlingTurretComponent {}

export const SlingTurretComponentArray = new ServerComponentArray<SlingTurretComponent, SlingTurretComponentParams, RenderParts>(ServerComponentType.slingTurret, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   // Base
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/sling-turret/sling-turret-base.png")
      )
   );

   // Plate
   const plateRenderPart = new TexturedRenderPart(
      null,
      1,
      0,
      getTextureArrayIndex("entities/sling-turret/sling-turret-plate.png")
   );
   plateRenderPart.addTag("turretComponent:pivoting");
   renderInfo.attachRenderPart(plateRenderPart);

   // Sling
   const slingRenderPart = new TexturedRenderPart(
      plateRenderPart,
      2,
      0,
      getTextureArrayIndex("entities/sling-turret/sling-turret-sling.png")
   );
   slingRenderPart.addTag("turretComponent:aiming");
   renderInfo.attachRenderPart(slingRenderPart);

   return {};
}

function createParamsFromData(): SlingTurretComponentParams {
   return {};
}

function createComponent(): SlingTurretComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}