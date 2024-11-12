import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playBuildingHitSound, playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface WorkerHutComponentParams {}

interface RenderParts {}

export interface WorkerHutComponent {}

export const WorkerHutComponentArray = new ClientComponentArray<WorkerHutComponent, RenderParts>(ClientComponentType.workerHut, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent
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
   const transformComponent = TransformComponentArray.getComponent(entity);
   playBuildingHitSound(transformComponent.position);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("building-destroy-1.mp3", 0.4, 1, transformComponent.position);
}