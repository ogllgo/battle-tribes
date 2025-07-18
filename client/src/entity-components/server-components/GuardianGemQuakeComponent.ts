import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { randItem } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import { createGemQuakeProjectile } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface GuardianGemQuakeComponentParams {}

interface IntermediateInfo {}

export interface GuardianGemQuakeComponent {}

const TEXTURE_SOURCES: ReadonlyArray<string> = [
   "entities/guardian-gem-quake/gem-1.png",
   "entities/guardian-gem-quake/gem-2.png",
   "entities/guardian-gem-quake/gem-3.png"
];

export const GuardianGemQuakeComponentArray = new ServerComponentArray<GuardianGemQuakeComponent, GuardianGemQuakeComponentParams, IntermediateInfo>(ServerComponentType.guardianGemQuake, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onLoad: onLoad,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): GuardianGemQuakeComponentParams {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(randItem(TEXTURE_SOURCES))
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): GuardianGemQuakeComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onLoad(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
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