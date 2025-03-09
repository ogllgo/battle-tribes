import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { randFloat } from "../../../../shared/src/utils";
import { Hitbox } from "../../hitboxes";
import { createWoodSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface TreeRootBaseComponentParams {}

interface IntermediateInfo {}

export interface TreeRootBaseComponent {}

export const TreeRootBaseComponentArray = new ServerComponentArray<TreeRootBaseComponent, TreeRootBaseComponentParams, IntermediateInfo>(ServerComponentType.treeRootBase, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): TreeRootBaseComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/tree-root-base/tree-root-base.png")
      )
   );

   return {};
}

function createComponent(): TreeRootBaseComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(): void {}

function updateFromData(): void {}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   for (let i = 0; i < 6; i++) {
      createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16 * Math.random());
   }

   playSoundOnHitbox("tree-root-base-hit.mp3", randFloat(0.47, 0.53), randFloat(0.9, 1.1), hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   for (let i = 0; i < 10; i++) {
      createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16 * Math.random());
   }

   playSoundOnHitbox("tree-root-base-death.mp3", 0.5, 1, hitbox, false);
}