import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";

export interface SlingTurretComponentParams {}

interface IntermediateInfo {}

export interface SlingTurretComponent {}

export const SlingTurretComponentArray = new ServerComponentArray<SlingTurretComponent, SlingTurretComponentParams, IntermediateInfo>(ServerComponentType.slingTurret, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   // Base
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/sling-turret/sling-turret-base.png")
      )
   );

   // Plate
   const plateRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      0,
      getTextureArrayIndex("entities/sling-turret/sling-turret-plate.png")
   );
   plateRenderPart.addTag("turretComponent:pivoting");
   entityIntermediateInfo.renderInfo.attachRenderPart(plateRenderPart);

   // Sling
   const slingRenderPart = new TexturedRenderPart(
      plateRenderPart,
      2,
      0,
      getTextureArrayIndex("entities/sling-turret/sling-turret-sling.png")
   );
   slingRenderPart.addTag("turretComponent:aiming");
   entityIntermediateInfo.renderInfo.attachRenderPart(slingRenderPart);

   return {};
}

const fillParams = (): SlingTurretComponentParams => {
   return {};
}

export function createSlingTurretComponentParams(): SlingTurretComponentParams {
   return fillParams();
}

function createParamsFromData(): SlingTurretComponentParams {
   return fillParams();
}

function createComponent(): SlingTurretComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

function padData(): void {}

function updateFromData(): void {}