import { HitData } from "../../../../shared/src/client-server-types";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { angle } from "../../../../shared/src/utils";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { EMBRASURE_TEXTURE_SOURCES } from "../server-components/BuildingMaterialComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface EmbrasureComponentParams {}

interface IntermediateInfo {}

export interface EmbrasureComponent {}

export const EmbrasureComponentArray = new ClientComponentArray<EmbrasureComponent, IntermediateInfo>(ClientComponentType.embrasure, true, {
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onHit: onHit,
   onDie: onDie
});

export function createEmbrasureComponentParams(): EmbrasureComponentParams {
   return {};
}

function populateIntermediateInfo(intermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const buildingMaterialComponentParams = entityParams.serverComponentParams[ServerComponentType.buildingMaterial]!;

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(EMBRASURE_TEXTURE_SOURCES[buildingMaterialComponentParams.material])
   );
   renderPart.addTag("buildingMaterialComponent:material");

   intermediateInfo.renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): EmbrasureComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   playSoundOnHitbox("wooden-wall-hit.mp3", 0.3, 1, hitbox, false);

   for (let i = 0; i < 4; i++) {
      createLightWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
   }

   for (let i = 0; i < 7; i++) {
      let offsetDirection = angle(hitData.hitPosition[0] - hitbox.box.position.x, hitData.hitPosition[1] - hitbox.box.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.position.x + 20 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + 20 * Math.cos(offsetDirection);
      createLightWoodSpeckParticle(spawnPositionX, spawnPositionY, 5);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   playSoundOnHitbox("wooden-wall-break.mp3", 0.4, 1, hitbox, false);

   for (let i = 0; i < 7; i++) {
      createLightWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 32 * Math.random());
   }

   for (let i = 0; i < 3; i++) {
      createWoodShardParticle(hitbox.box.position.x, hitbox.box.position.y, 32);
   }
}