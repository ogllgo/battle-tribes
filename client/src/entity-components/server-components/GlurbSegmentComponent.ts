import { HitData } from "../../../../shared/src/client-server-types";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { randFloat, Point } from "../../../../shared/src/utils";
import { createSlurbParticle } from "../../particles";
import { coatSlimeTrails } from "../../rendering/webgl/slime-trail-rendering";
import { playSound, playSoundOnHitbox } from "../../sound";
import { getEntityLayer } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { entityIsVisibleToCamera, TransformComponentArray, getRandomPositionInBox } from "./TransformComponent";

export interface GlurbSegmentComponentParams {}

export interface GlurbSegmentComponent {}

export const GlurbSegmentComponentArray = new ServerComponentArray<GlurbSegmentComponent, GlurbSegmentComponentParams, never>(ServerComponentType.glurbSegment, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): GlurbSegmentComponentParams {
   return {};
}

function createComponent(): GlurbSegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

function padData(): void {}

function updateFromData(): void {}

function onTick(glurb: Entity): void {
   // @Hack
   if (entityIsVisibleToCamera(glurb)) {
      const layer = getEntityLayer(glurb);
      const transformComponent = TransformComponentArray.getComponent(glurb);
      for (const hitbox of transformComponent.hitboxes) {
         coatSlimeTrails(layer, hitbox.box);
      }
   }
}

function onHit(entity: Entity, hitData: HitData): void {
   console.log("activate");
   for (let i = 0; i < 10; i++) {
      const spawnPositionX = hitData.hitPosition[0];
      const spawnPositionY = hitData.hitPosition[1];
      createSlurbParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 120), 0, 0);
   }

   playSound("glurb-hit.mp3", 0.4, randFloat(0.9, 1.2), Point.unpackage(hitData.hitPosition), getEntityLayer(entity));
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   for (let i = 0; i < 3; i++) {
      const pos = getRandomPositionInBox(hitbox.box);
      createSlurbParticle(pos.x, pos.y, 2 * Math.PI * Math.random(), randFloat(80, 120), 0, 0);
   }

   playSoundOnHitbox("glurb-death.mp3", 0.2, 1, hitbox, false);
}