import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { randAngle, randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getHitboxVelocity, Hitbox } from "../../hitboxes";
import { createArrowDestroyParticle, createRockParticle, createRockSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface SlingTurretRockComponentParams {}

interface IntermediateInfo {}

export interface SlingTurretRockComponent {}

export const SlingTurretRockComponentArray = new ServerComponentArray<SlingTurretRockComponent, SlingTurretRockComponentParams, IntermediateInfo>(ServerComponentType.slingTurretRock, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onDie: onDie,
   padData: padData,
   updateFromData: updateFromData
});

export function createSlingTurretRockComponentParams(): SlingTurretRockComponentParams {
   return {};
}

function createParamsFromData(): SlingTurretRockComponentParams {
   return createSlingTurretRockComponentParams();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("projectiles/sling-rock.png")
      )
   );

   return {};
}

function createComponent(): SlingTurretRockComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   const velocity = getHitboxVelocity(hitbox);

   // Create arrow break particles
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(hitbox.box.position.x, hitbox.box.position.y, velocity.x, velocity.y);
   }

   for (let i = 0; i < 3; i++) {
      const spawnOffsetMagnitude = 16 * Math.random();
      const spawnOffsetDirection = randAngle();
      const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createRockParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(60, 100), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      createRockSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16, 0, 0, ParticleRenderLayer.low);
   }
}

function padData(): void {}

function updateFromData(): void {}