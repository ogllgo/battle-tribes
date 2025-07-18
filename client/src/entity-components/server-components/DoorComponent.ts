import { ServerComponentType } from "battletribes-shared/components";
import { DoorToggleType, Entity } from "battletribes-shared/entities";
import { playSoundOnHitbox } from "../../sound";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { DOOR_TEXTURE_SOURCES } from "./BuildingMaterialComponent";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../../particles";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { randAngle } from "../../../../shared/src/utils";

export interface DoorComponentParams {
   readonly toggleType: DoorToggleType;
   readonly openProgress: number;
}

interface IntermediateInfo {}

export interface DoorComponent {
   toggleType: DoorToggleType;
   openProgress: number;
}

export const DoorComponentArray = new ServerComponentArray<DoorComponent, DoorComponentParams, IntermediateInfo>(ServerComponentType.door, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

const fillParams = (toggleType: DoorToggleType, openProgress: number): DoorComponentParams => {
   return {
      toggleType: toggleType,
      openProgress: openProgress
   };
}

export function createDoorComponentParams(): DoorComponentParams {
   return fillParams(DoorToggleType.none, 0);
}

function createParamsFromData(reader: PacketReader): DoorComponentParams {
   const toggleType = reader.readNumber();
   const openProgress = reader.readNumber();
   return fillParams(toggleType, openProgress);
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const buildingMaterialComponentParams = entityParams.serverComponentParams[ServerComponentType.buildingMaterial]!;

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(DOOR_TEXTURE_SOURCES[buildingMaterialComponentParams.material])
   );
   renderPart.addTag("buildingMaterialComponent:material");

   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityParams: EntityParams): DoorComponent {
   const doorComponentParams = entityParams.serverComponentParams[ServerComponentType.door]!;
   
   return {
      toggleType: doorComponentParams.toggleType,
      openProgress: doorComponentParams.openProgress
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const toggleType = reader.readNumber();
   const openProgress = reader.readNumber();
   
   const doorComponent = DoorComponentArray.getComponent(entity);
   if (toggleType === DoorToggleType.open && doorComponent.toggleType === DoorToggleType.none) {
      playSoundOnHitbox("door-open.mp3", 0.4, 1, entity, hitbox, false);
   } else if (toggleType === DoorToggleType.close && doorComponent.toggleType === DoorToggleType.none) {
      playSoundOnHitbox("door-close.mp3", 0.4, 1, entity, hitbox, false);
   }

   doorComponent.toggleType = toggleType;
   doorComponent.openProgress = openProgress;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("wooden-wall-hit.mp3", 0.3, 1, entity, hitbox, false);

   for (let i = 0; i < 4; i++) {
      createLightWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
   }

   for (let i = 0; i < 7; i++) {
      const position = hitbox.box.position.offset(20, randAngle());
      createLightWoodSpeckParticle(position.x, position.y, 5);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   playSoundOnHitbox("wooden-wall-break.mp3", 0.4, 1, entity, hitbox, false);

   for (let i = 0; i < 7; i++) {
      createLightWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 32 * Math.random());
   }

   for (let i = 0; i < 3; i++) {
      createWoodShardParticle(hitbox.box.position.x, hitbox.box.position.y, 32);
   }
}