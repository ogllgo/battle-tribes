import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { EntityConfig } from "../ComponentArray";
import { WALL_SPIKE_TEXTURE_SOURCES, FLOOR_SPIKE_TEXTURE_SOURCES } from "../server-components/BuildingMaterialComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface RegularSpikesComponentParams {}

interface RenderParts {}

export interface RegularSpikesComponent {}

export const RegularSpikesComponentArray = new ClientComponentArray<RegularSpikesComponent, RenderParts>(ClientComponentType.regularSpikes, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onHit: onHit,
   onDie: onDie
});

export function createRegularSpikesComponentParams(): RegularSpikesComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.buildingMaterial, never>): RenderParts {
   const materialComponentParams = entityConfig.serverComponents[ServerComponentType.buildingMaterial];

   const isAttachedToWall = entityConfig.entityType === EntityType.wallSpikes;
   let textureArrayIndex: number;
   if (isAttachedToWall) {
      textureArrayIndex = getTextureArrayIndex(WALL_SPIKE_TEXTURE_SOURCES[materialComponentParams.material]);
   } else {
      textureArrayIndex = getTextureArrayIndex(FLOOR_SPIKE_TEXTURE_SOURCES[materialComponentParams.material]);
   }

   const mainRenderPart = new TexturedRenderPart(
      null,
      0,
      0,
      textureArrayIndex
   )
   mainRenderPart.addTag("buildingMaterialComponent:material");

   renderInfo.attachRenderPart(mainRenderPart);

   return {};
}

function createComponent(): RegularSpikesComponent {
   return {};
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("wooden-spikes-hit.mp3", 0.2, 1, transformComponent.position);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("wooden-spikes-destroy.mp3", 0.4, 1, transformComponent.position);
}