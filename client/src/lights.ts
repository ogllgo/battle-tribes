import { assert, Point } from "battletribes-shared/utils";
import Board from "./Board";
import { entityExists, getEntityLayer, getEntityRenderInfo } from "./world";
import { createTranslationMatrix, Matrix3x3, matrixMultiplyInPlace } from "./rendering/matrices";
import Layer from "./Layer";
import { Entity } from "../../shared/src/entities";
import { RenderPart } from "./render-parts/render-parts";

export type LightID = number;

export interface Light {
   readonly id: number;
   readonly offset: Point;
   intensity: number;
   /** Number of tiles from the source it takes for the light's intensity to halve */
   strength: number;
   radius: number;
   r: number;
   g: number;
   b: number;
}

interface LightRenderPartInfo {
   readonly renderPart: RenderPart;
   // We store the entity for the render part on the light instead of the render part to save memory (the vast majority of render parts won't have lights on them)
   readonly entity: Entity;
}

let lightIDCounter = 0;
   
const lightRecord: Record<LightID, Light> = {};

const lightToEntityRecord: Partial<Record<LightID, number>> = {};
const entityToLightsRecord: Partial<Record<number, Array<LightID>>> = {};

const lightToRenderPartRecord: Partial<Record<LightID, LightRenderPartInfo>> = {};
const renderPartToLightsRecord: Partial<Record<number, Array<LightID>>> = {};

const getLightLayer = (light: Light): Layer => {
   const attachedEntity = lightToEntityRecord[light.id];
   if (typeof attachedEntity !== "undefined") {
      return getEntityLayer(attachedEntity);
   }

   const attachedRenderPartInfo = lightToRenderPartRecord[light.id];
   if (typeof attachedRenderPartInfo !== "undefined") {
      return getEntityLayer(attachedRenderPartInfo.entity);
   }

   throw new Error();
}

export function createLight(offset: Point, intensity: number, strength: number, radius: number, r: number, g: number, b: number): Light {
   const lightID = lightIDCounter++;

   return {
      id: lightID,
      offset: offset,
      intensity: intensity,
      strength: strength,
      radius: radius,
      r: r,
      g: g,
      b: b
   };
}

const addLightToLayer = (light: Light, layer: Layer): void => {
   // Make sure the light doesn't already exist
   assert(typeof lightRecord[light.id] === "undefined")
   
   layer.lights.push(light);
   lightRecord[light.id] = light;
}

export function attachLightToEntity(light: Light, entity: Entity): void {
   const layer = getEntityLayer(entity);
   addLightToLayer(light, layer);

   lightToEntityRecord[light.id] = entity;

   const lightIDs = entityToLightsRecord[entity];
   if (typeof lightIDs === "undefined") {
      entityToLightsRecord[entity] = [light.id];
   } else {
      lightIDs.push(light.id);
   }
}

// @Cleanup: the 3 final parameters are all related, and ideally should just be able to be deduced from the render part? maybe?
export function attachLightToRenderPart(light: Light, renderPart: RenderPart, entity: Entity, layer: Layer): void {
   addLightToLayer(light, layer);
   
   lightToRenderPartRecord[light.id] = {
      renderPart: renderPart,
      entity: entity
   };

   const lightIDs = renderPartToLightsRecord[renderPart.id];
   if (typeof lightIDs === "undefined") {
      renderPartToLightsRecord[renderPart.id] = [light.id];
   } else {
      lightIDs.push(light.id);
   }
}

export function removeLight(light: Light): void {
   const layer = getLightLayer(light);
   
   const idx = layer.lights.indexOf(light);
   if (idx === -1) {
      return;
   }
   
   layer.lights.splice(idx, 1);

   const entityID = lightToEntityRecord[light.id];
   delete lightToEntityRecord[light.id];
   if (typeof entityID !== "undefined") {
      const idx = entityToLightsRecord[entityID]!.indexOf(light.id);
      entityToLightsRecord[entityID]!.splice(idx, 1);
      if (entityToLightsRecord[entityID]!.length === 0) {
         delete entityToLightsRecord[entityID];
      }

      return;
   }

   const renderPartInfo = lightToRenderPartRecord[light.id];
   delete lightToRenderPartRecord[light.id];

   // If the light was attached to a render light, register the light's removal from that render part
   if (typeof renderPartInfo !== "undefined") {
      const renderPartID = renderPartInfo.renderPart.id;
      
      const idx = renderPartToLightsRecord[renderPartID]!.indexOf(light.id);
      renderPartToLightsRecord[renderPartID]!.splice(idx, 1);
      if (renderPartToLightsRecord[renderPartID]!.length === 0) {
         delete renderPartToLightsRecord[renderPartID];
      }

      return;
   }

   throw new Error();
}

export function removeLightsAttachedToEntity(entity: Entity): void {
   const lightIDs = entityToLightsRecord[entity];
   if (typeof lightIDs === "undefined") {
      return;
   }

   for (let i = lightIDs.length - 1; i >= 0; i--) {
      const lightID = lightIDs[i];
      const light = lightRecord[lightID];
      removeLight(light);
   }
}

export function removeLightsAttachedToRenderPart(renderPart: RenderPart): void {
   const lightIDs = renderPartToLightsRecord[renderPart.id];
   if (typeof lightIDs === "undefined") {
      return;
   }

   for (let i = lightIDs.length - 1; i >= 0; i--) {
      const lightID = lightIDs[i];
      const light = lightRecord[lightID];
      removeLight(light);
   }
}

export function getLightPositionMatrix(light: Light): Matrix3x3 {
   const attachedRenderPartInfo = lightToRenderPartRecord[light.id];
   if (typeof attachedRenderPartInfo !== "undefined") {
      const renderPartID = attachedRenderPartInfo.renderPart.id;
      const renderPart = Board.renderPartRecord[renderPartID];

      // @Speed @Copynpaste
      const matrix = createTranslationMatrix(light.offset.x, light.offset.y);
      matrixMultiplyInPlace(renderPart.modelMatrix, matrix);
      // const matrix = copyMatrix(renderPart.modelMatrix);
      // // @Hack: why do we need to rotate the offset?
      // translateMatrix(matrix, light.offset.x, light.offset.y);

      return matrix;
   }

   const attachedEntity = lightToEntityRecord[light.id];
   if (typeof attachedEntity !== "undefined" && entityExists(attachedEntity)) {
      // @Speed @Copynpaste
      const matrix = createTranslationMatrix(light.offset.x, light.offset.y);
      
      const renderInfo = getEntityRenderInfo(attachedEntity);
      matrixMultiplyInPlace(renderInfo.modelMatrix, matrix);

      return matrix;
   }

   // @Incomplete
   // Make "attach light to world" logic
   throw new Error();
   // return light.offset;
}