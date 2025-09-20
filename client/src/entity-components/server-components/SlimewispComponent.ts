import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface SlimewispComponentParams {}

interface IntermediateInfo {}

export interface SlimewispComponent {}

const RADIUS = 16;

export const SlimewispComponentArray = new ServerComponentArray<SlimewispComponent, SlimewispComponentParams, IntermediateInfo>(ServerComponentType.slimewisp, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): SlimewispComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(`entities/slimewisp/slimewisp.png`)
   );
   renderPart.opacity = 0.8;
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): SlimewispComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}

function onHit(_entity: Entity, hitbox: Hitbox): void {
   createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, RADIUS);

   for (let i = 0; i < 2; i++) {
      createSlimeSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, RADIUS * Math.random());
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, RADIUS);

   for (let i = 0; i < 3; i++) {
      createSlimeSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, RADIUS * Math.random());
   }
}