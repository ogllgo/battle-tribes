import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { randItem } from "../../../../shared/src/utils";
import { createGemQuakeProjectile } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface GuardianGemQuakeComponentParams {}

export interface GuardianGemQuakeComponent {}

const TEXTURE_SOURCES: ReadonlyArray<string> = [
   "entities/guardian-gem-quake/gem-1.png",
   "entities/guardian-gem-quake/gem-2.png",
   "entities/guardian-gem-quake/gem-3.png"
];

export const GuardianGemQuakeComponentArray = new ServerComponentArray<GuardianGemQuakeComponent, GuardianGemQuakeComponentParams, never>(ServerComponentType.guardianGemQuake, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onLoad: onLoad,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): GuardianGemQuakeComponentParams {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   
   return {};
}

function createComponent(): GuardianGemQuakeComponent {
   return {};
}

function onLoad(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(randItem(TEXTURE_SOURCES))
   );

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderPart(renderPart);

   for (let i = 0; i < 2; i++) {
      createGemQuakeProjectile(transformComponent);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   // @Incomplete?
   const guardianGemFragmentProjectileComponent = GuardianGemQuakeComponentArray.getComponent(entity);
   const life = reader.readNumber();
}