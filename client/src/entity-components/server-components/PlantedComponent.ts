import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { randAngle, randFloat } from "../../../../shared/src/utils";
import { Hitbox } from "../../hitboxes";
import { createDirtParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface PlantedComponentParams {}

export interface PlantedComponent {}

export const PlantedComponentArray = new ServerComponentArray<PlantedComponent, PlantedComponentParams, never>(ServerComponentType.planted, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
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

function getMaxRenderParts(): number {
   return 0;
}

function padData(): void {}

function updateFromData(): void {}

function onSpawn(entity: Entity): void {
   // Create dirt particles
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   for (let i = 0; i < 7; i++) {
      const offsetDirection = randAngle();
      const offsetMagnitude = randFloat(0, 10);
      const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
      createDirtParticle(x, y, ParticleRenderLayer.high);
   }
}