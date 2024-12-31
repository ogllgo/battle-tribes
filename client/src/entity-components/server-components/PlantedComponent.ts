import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { randFloat } from "../../../../shared/src/utils";
import { createDirtParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface PlantedComponentParams {}

export interface PlantedComponent {}

export const PlantedComponentArray = new ServerComponentArray<PlantedComponent, PlantedComponentParams, never>(ServerComponentType.planted, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
   onSpawn: onSpawn
});

function createParamsFromData(): PlantedComponentParams {
   return {};
}

function createComponent(): PlantedComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}

function onSpawn(entity: Entity): void {
   // Create dirt particles
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < 7; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetMagnitude = randFloat(0, 10);
      const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
      createDirtParticle(x, y, ParticleRenderLayer.high);
   }
}