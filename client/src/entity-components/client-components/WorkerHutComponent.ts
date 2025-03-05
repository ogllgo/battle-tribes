import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface WorkerHutComponentParams {}

interface IntermediateInfo {}

export interface WorkerHutComponent {}

export const WorkerHutComponentArray = new ClientComponentArray<WorkerHutComponent, IntermediateInfo>(ClientComponentType.workerHut, true, {
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onHit: onHit,
   onDie: onDie
});

export function createWorkerHutComponentParams(): WorkerHutComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   // Hut
   const hutRenderPart = new TexturedRenderPart(
      hitbox,
      2,
      0,
      getTextureArrayIndex("entities/worker-hut/worker-hut.png")
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(hutRenderPart);

   // Door
   const doorRenderPart = new TexturedRenderPart(
      hutRenderPart,
      1,
      0,
      getTextureArrayIndex("entities/worker-hut/worker-hut-door.png")
   );
   doorRenderPart.addTag("hutComponent:door");
   entityIntermediateInfo.renderInfo.attachRenderPart(doorRenderPart);

   return {};
}

function createComponent(): WorkerHutComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 2;
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playBuildingHitSound(hitbox);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("building-destroy-1.mp3", 0.4, 1, hitbox, false);
}