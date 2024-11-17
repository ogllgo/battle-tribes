import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playBuildingHitSound, playSound, playSoundOnEntity } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface WorkerHutComponentParams {}

interface RenderParts {}

export interface WorkerHutComponent {}

export const WorkerHutComponentArray = new ClientComponentArray<WorkerHutComponent, RenderParts>(ClientComponentType.workerHut, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onHit: onHit,
   onDie: onDie
});

export function createWorkerHutComponentParams(): WorkerHutComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   // Hut
   const hutRenderPart = new TexturedRenderPart(
      null,
      2,
      0,
      getTextureArrayIndex("entities/worker-hut/worker-hut.png")
   );
   renderInfo.attachRenderPart(hutRenderPart);

   // Door
   const doorRenderPart = new TexturedRenderPart(
      null,
      1,
      0,
      getTextureArrayIndex("entities/worker-hut/worker-hut-door.png")
   );
   doorRenderPart.addTag("hutComponent:door");
   renderInfo.attachRenderPart(doorRenderPart);

   return {};
}

function createComponent(): WorkerHutComponent {
   return {};
}

function onHit(entity: Entity): void {
   playBuildingHitSound(entity);
}

function onDie(entity: Entity): void {
   playSoundOnEntity("building-destroy-1.mp3", 0.4, 1, entity);
}