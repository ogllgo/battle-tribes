import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface WarriorHutComponentParams {}

interface IntermediateInfo {}

export interface WarriorHutComponent {}

export const WarriorHutComponentArray = new ClientComponentArray<WarriorHutComponent, IntermediateInfo>(ClientComponentType.warriorHut, true, {
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onHit: onHit,
   onDie: onDie
});

export function createWarriorHutComponentParams(): WarriorHutComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   // Hut
   const hutRenderPart = new TexturedRenderPart(
      hitbox,
      2,
      0,
      getTextureArrayIndex("entities/warrior-hut/warrior-hut.png")
   );
   renderInfo.attachRenderPart(hutRenderPart);

   // Doors
   const doorRenderParts = new Array<VisualRenderPart>();
   for (let i = 0; i < 2; i++) {
      const doorRenderPart = new TexturedRenderPart(
         hutRenderPart,
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

function onHit(entity: Entity, hitbox: Hitbox): void {
   playBuildingHitSound(entity, hitbox);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   playSoundOnHitbox("building-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
}