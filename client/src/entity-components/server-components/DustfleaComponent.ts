import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { Entity } from "../../../../shared/src/entities";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface DustfleaComponentParams {}

interface IntermediateInfo {}

export interface DustfleaComponent {}

export const DustfleaComponentArray = new ServerComponentArray<DustfleaComponent, DustfleaComponentParams, IntermediateInfo>(ServerComponentType.dustflea, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): DustfleaComponentParams {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/dustflea/dustflea.png")
      )
   );

   return {};
}

function createComponent(): DustfleaComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}
   
function padData(reader: PacketReader): void {}

function updateFromData(reader: PacketReader): void {}

function onHit(dustflea: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("dustflea-hit.mp3", 0.4, randFloat(0.9, 1.1), dustflea, hitbox, false);
}

function onDie(dustflea: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(dustflea);
   const hitbox = transformComponent.children[0] as Hitbox;
   playSoundOnHitbox("dustflea-explosion.mp3", 0.4, randFloat(0.9, 1.1), dustflea, hitbox, false);
}