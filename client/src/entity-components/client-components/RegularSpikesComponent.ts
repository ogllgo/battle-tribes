import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { WALL_SPIKE_TEXTURE_SOURCES, FLOOR_SPIKE_TEXTURE_SOURCES } from "../server-components/BuildingMaterialComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface RegularSpikesComponentParams {}

interface IntermediateInfo {}

export interface RegularSpikesComponent {}

export const RegularSpikesComponentArray = new ClientComponentArray<RegularSpikesComponent, IntermediateInfo>(ClientComponentType.regularSpikes, true, {
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onHit: onHit,
   onDie: onDie
});

export function createRegularSpikesComponentParams(): RegularSpikesComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   const materialComponentParams = entityParams.serverComponentParams[ServerComponentType.buildingMaterial]!;

   const isAttachedToWall = entityParams.entityType === EntityType.wallSpikes;
   let textureArrayIndex: number;
   if (isAttachedToWall) {
      textureArrayIndex = getTextureArrayIndex(WALL_SPIKE_TEXTURE_SOURCES[materialComponentParams.material]);
   } else {
      textureArrayIndex = getTextureArrayIndex(FLOOR_SPIKE_TEXTURE_SOURCES[materialComponentParams.material]);
   }

   const mainRenderPart = new TexturedRenderPart(
      hitbox,
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

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("wooden-spikes-hit.mp3", 0.2, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   playSoundOnHitbox("wooden-spikes-destroy.mp3", 0.4, 1, entity, hitbox, false);
}