import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface ProjectileComponentParams {}

export interface ProjectileComponent {}

export const ProjectileComponentArray = new ServerComponentArray<ProjectileComponent, ProjectileComponentParams, never>(ServerComponentType.projectile, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): ProjectileComponentParams {
   return {};
}

function createComponent(): ProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(): void {}
   
function updateFromData(): void {}