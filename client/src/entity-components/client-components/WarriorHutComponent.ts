import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playBuildingHitSound, playSoundOnEntity } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface WarriorHutComponentParams {}

interface RenderParts {}

export interface WarriorHutComponent {}

export const WarriorHutComponentArray = new ClientComponentArray<WarriorHutComponent, RenderParts>(ClientComponentType.warriorHut, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
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
   renderInfo.attachRenderPart(hutRenderPart);

   // Doors
   const doorRenderParts = new Array<VisualRenderPart>();
   for (let i = 0; i < 2; i++) {
      const doorRenderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("entities/warrior-hut/warrior-hut-door.png")
      );
      doorRenderPart.addTag("hutComponent:door");
      renderInfo.attachRenderPart(doorRenderPart);
      doorRenderParts.push(doorRenderPart);
   }

   return {};
}

function createComponent(): WarriorHutComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

function onHit(entity: Entity): void {
   playBuildingHitSound(entity);
}

function onDie(entity: Entity): void {
   playSoundOnEntity("building-destroy-1.mp3", 0.4, 1, entity, false);
}