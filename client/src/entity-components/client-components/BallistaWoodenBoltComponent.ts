import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface BallistaWoodenBoltComponentParams {}

interface IntermediateInfo {}

export interface BallistaWoodenBoltComponent {}

export const BallistaWoodenBoltComponentArray = new ClientComponentArray<BallistaWoodenBoltComponent, IntermediateInfo>(ClientComponentType.ballistaWoodenBolt, true, {
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onDie: onDie
});

export function createBallistaWoodenBoltComponentParams(): BallistaWoodenBoltComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("projectiles/wooden-bolt.png")
      )
   );

   return {};
}

function createComponent(): BallistaWoodenBoltComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onDie(entity: Entity): void {
   // Create arrow break particles
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(hitbox.box.position.x, hitbox.box.position.y, hitbox.velocity.x, hitbox.velocity.y);
   }
}