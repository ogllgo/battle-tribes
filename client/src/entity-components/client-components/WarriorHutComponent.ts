import { EntityID } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playBuildingHitSound, playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface WarriorHutComponentParams {}

interface RenderParts {}

export interface WarriorHutComponent {}

export const WarriorHutComponentArray = new ClientComponentArray<WarriorHutComponent, RenderParts>(ClientComponentType.warriorHut, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onHit: onHit,
   onDie: onDie
});

export function createWarriorHutComponentParams(): WarriorHutComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   // Hut
   const hutRenderPart = new TexturedRenderPart(
      null,
      2,
      0,
      getTextureArrayIndex("entities/warrior-hut/warrior-hut.png")
   );
   renderInfo.attachRenderThing(hutRenderPart);

   // Doors
   const doorRenderParts = new Array<RenderPart>();
   for (let i = 0; i < 2; i++) {
      const doorRenderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("entities/warrior-hut/warrior-hut-door.png")
      );
      doorRenderPart.addTag("hutComponent:door");
      renderInfo.attachRenderThing(doorRenderPart);
      doorRenderParts.push(doorRenderPart);
   }

   return {};
}

function createComponent(): WarriorHutComponent {
   return {};
}

function onHit(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playBuildingHitSound(transformComponent.position);
}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("building-destroy-1.mp3", 0.4, 1, transformComponent.position);
}