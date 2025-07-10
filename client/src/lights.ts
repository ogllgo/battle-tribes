import { assert, Point, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import Board from "./Board";
import { getEntityLayer } from "./world";
import { createTranslationMatrix, Matrix3x2, matrixMultiplyInPlace } from "./rendering/matrices";
import Layer from "./Layer";
import { Entity } from "../../shared/src/entities";
import { RenderPart } from "./render-parts/render-parts";
import { EntityRenderInfo } from "./EntityRenderInfo";
import { PacketReader } from "../../shared/src/packets";
import { Hitbox } from "./hitboxes";
import { getHitboxByLocalID, TransformComponentArray } from "./entity-components/server-components/TransformComponent";

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

interface LightHitboxInfo {
   // Store the entity for the hitbox on the light instead of the hitbox to save memory (the vast majority of hitboxes won't have lights on them)
   readonly entity: Entity;
   readonly hitbox: Hitbox;
}

export interface LightIntermediateInfo {
   readonly light: Light;
   readonly attachedHitbox: Hitbox;
}

const lightRecord: Partial<Record<LightID, Light>> = {};

const lightToHitboxRecord: Partial<Record<LightID, LightHitboxInfo>> = {};
const hitboxToLightsMap = new Map<Hitbox, Array<LightID>>();

export function getNumLights(): number {
   return Object.keys(lightRecord).length;
}

const getLightLayer = (light: Light): Layer => {
   const attachedRenderPartInfo = lightToHitboxRecord[light.id];
   if (typeof attachedRenderPartInfo !== "undefined") {
      return getEntityLayer(attachedRenderPartInfo.entity);
   }

   throw new Error();
}

export function createLight(id: LightID, offset: Point, intensity: number, strength: number, radius: number, r: number, g: number, b: number): Light {
   return {
      id: id,
      offset: offset,
      intensity: intensity,
      strength: strength,
      radius: radius,
      r: r,
      g: g,
      b: b
   };
}

// @Cleanup: the 2 final parameters are all related, and ideally should just be able to be deduced from the render part? maybe?
export function attachLightToHitbox(light: Light, entity: Entity, hitbox: Hitbox): void {
   // Make sure the light doesn't already exist
   assert(typeof lightRecord[light.id] === "undefined")

   const layer = getEntityLayer(entity);
   
   layer.lights.push(light);
   lightRecord[light.id] = light;
   
   lightToHitboxRecord[light.id] = {
      entity: entity,
      hitbox: hitbox
   };

   const lightIDs = hitboxToLightsMap.get(hitbox);
   if (typeof lightIDs === "undefined") {
      hitboxToLightsMap.set(hitbox, [light.id]);
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
   delete lightRecord[light.id];

   const renderPartInfo = lightToHitboxRecord[light.id];
   delete lightToHitboxRecord[light.id];

   // If the light was attached to a render light, register the light's removal from that render part
   if (typeof renderPartInfo !== "undefined") {
      const hitbox = renderPartInfo.hitbox;
      
      const lightIDs = hitboxToLightsMap.get(hitbox)!;
      const idx = lightIDs.indexOf(light.id);
      lightIDs.splice(idx, 1);
      if (lightIDs.length === 0) {
         hitboxToLightsMap.delete(hitbox);
      }

      return;
   }

   throw new Error();
}

export function removeLightsAttachedToHitbox(hitbox: Hitbox): void {
   const lightIDs = hitboxToLightsMap.get(hitbox);
   if (typeof lightIDs === "undefined") {
      return;
   }

   for (let i = lightIDs.length - 1; i >= 0; i--) {
      const lightID = lightIDs[i];
      const light = lightRecord[lightID];
      if (typeof light !== "undefined") {
         removeLight(light);
      }
   }
}

export function getLightPositionMatrix(light: Light): Matrix3x2 {
   const attachedHitboxInfo = lightToHitboxRecord[light.id];
   if (typeof attachedHitboxInfo !== "undefined") {
      const hitbox = attachedHitboxInfo.hitbox;

      const x = hitbox.box.position.x + rotateXAroundOrigin(light.offset.x, light.offset.y, hitbox.box.angle);
      const y = hitbox.box.position.y + rotateYAroundOrigin(light.offset.x, light.offset.y, hitbox.box.angle);
      return createTranslationMatrix(x, y);
   }

   // @Incomplete
   // Make "attach light to world" logic
   throw new Error();
   // return light.offset;
}

export function updateLightsFromData(reader: PacketReader): void {
   const numLights = reader.readNumber();
   for (let i = 0; i < numLights; i++) {
      const entity = reader.readNumber();
      const hitboxLocalID = reader.readNumber();

      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = getHitboxByLocalID(transformComponent.children, hitboxLocalID);
      assert(hitbox !== null);
      
      const lightID = reader.readNumber();

      const existingLight = lightRecord[lightID];
      if (typeof existingLight !== "undefined") {
         reader.padOffset(8 * Float32Array.BYTES_PER_ELEMENT);
      } else {
         // New light

         const offset = reader.readPoint();
         const intensity = reader.readNumber();
         const strength = reader.readNumber();
         const radius = reader.readNumber();
         const r = reader.readNumber();
         const g = reader.readNumber();
         const b = reader.readNumber();

         const light = createLight(lightID, offset, intensity, strength, radius, r, g, b);
         attachLightToHitbox(light, entity, hitbox);
      }
   }
}