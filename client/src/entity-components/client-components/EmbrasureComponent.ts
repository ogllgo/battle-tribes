import { HitData } from "../../../../shared/src/client-server-types";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { angle } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { EntityConfig } from "../ComponentArray";
import { EMBRASURE_TEXTURE_SOURCES } from "../server-components/BuildingMaterialComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface EmbrasureComponentParams {}

interface RenderParts {}

export interface EmbrasureComponent {}

export const EmbrasureComponentArray = new ClientComponentArray<EmbrasureComponent, RenderParts>(ClientComponentType.embrasure, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onHit: onHit,
   onDie: onDie
});

export function createEmbrasureComponentParams(): EmbrasureComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.buildingMaterial, never>): RenderParts {
   const buildingMaterialComponentParams = entityConfig.serverComponents[ServerComponentType.buildingMaterial];

   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(EMBRASURE_TEXTURE_SOURCES[buildingMaterialComponentParams.material])
   );
   renderPart.addTag("buildingMaterialComponent:material");

   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): EmbrasureComponent {
   return {};
}

function onHit(entity: Entity, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   playSound("wooden-wall-hit.mp3", 0.3, 1, transformComponent.position);

   for (let i = 0; i < 4; i++) {
      createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 20);
   }

   for (let i = 0; i < 7; i++) {
      let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = transformComponent.position.x + 20 * Math.sin(offsetDirection);
      const spawnPositionY = transformComponent.position.y + 20 * Math.cos(offsetDirection);
      createLightWoodSpeckParticle(spawnPositionX, spawnPositionY, 5);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   playSound("wooden-wall-break.mp3", 0.4, 1, transformComponent.position);

   for (let i = 0; i < 7; i++) {
      createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 32 * Math.random());
   }

   for (let i = 0; i < 3; i++) {
      createWoodShardParticle(transformComponent.position.x, transformComponent.position.y, 32);
   }
}