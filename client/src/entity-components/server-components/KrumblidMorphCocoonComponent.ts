import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { PacketReader } from "../../../../shared/src/packets";
import { TransformComponentArray } from "./TransformComponent";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { Settings } from "../../../../shared/src/settings";
import { randAngle, randFloat } from "../../../../shared/src/utils";
import { createCocoonAmbientParticle, createCocoonFragmentParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface KrumblidMorphCocoonComponentParams {
   readonly stage: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface KrumblidMorphCocoonComponent {
   stage: number;
   readonly renderPart: TexturedRenderPart;
}

export const KrumblidMorphCocoonComponentArray = new ServerComponentArray<KrumblidMorphCocoonComponent, KrumblidMorphCocoonComponentParams, IntermediateInfo>(ServerComponentType.krumblidMorphCocoon, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie,
   onTick: onTick
});

const getTextureSource = (stage: number): string => {
   return "entities/krumblid-morph-cocoon/stage-" + stage + ".png";
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const krumblidMorphCocoonComponentParams = entityParams.serverComponentParams[ServerComponentType.krumblidMorphCocoon]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(getTextureSource(krumblidMorphCocoonComponentParams.stage))
   );
   renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

export function createKrumblidMorphCocoonComponentParams(stage: number): KrumblidMorphCocoonComponentParams {
   return {
      stage: stage
   };
}

function createParamsFromData(reader: PacketReader): KrumblidMorphCocoonComponentParams {
   const stage = reader.readNumber();
   
   return createKrumblidMorphCocoonComponentParams(stage);
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): KrumblidMorphCocoonComponent {
   const krumblidMorphCocoonComponentParams = entityParams.serverComponentParams[ServerComponentType.krumblidMorphCocoon]!;

   return {
      stage: krumblidMorphCocoonComponentParams.stage,
      renderPart: intermediateInfo.renderPart,
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(cocoon: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(cocoon);
   const hitbox = transformComponent.hitboxes[0];
  
   const hitboxRadius = (hitbox.box as CircularBox).radius;
   const particleChance = hitboxRadius / Settings.TPS / 20;
   if (Math.random() < particleChance) {
      const offsetDirection = randAngle();
      const x = hitbox.box.position.x + hitboxRadius * Math.sin(offsetDirection);
      const y = hitbox.box.position.y + hitboxRadius * Math.cos(offsetDirection);
      createCocoonAmbientParticle(x, y, offsetDirection + randFloat(-0.2, 0.2));
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const krumblidMorphComponent = KrumblidMorphCocoonComponentArray.getComponent(entity);

   const stage = reader.readNumber();

   if (stage !== krumblidMorphComponent.stage) {
      krumblidMorphComponent.renderPart.switchTextureSource(getTextureSource(stage));
      krumblidMorphComponent.stage = stage;
   }
}

function onHit(entity: Entity): void {
   // const transformComponent = TransformComponentArray.getComponent(entity);
   // const hitbox = transformComponent.hitboxes[0];
   // playBuildingHitSound(entity, hitbox);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("cocoon-break.mp3", 0.4, 1, entity, hitbox, false);
   
   const hitboxRadius = (hitbox.box as CircularBox).radius;
   for (let i = 0; i < 7; i++) {
      const offsetDirection = randAngle();
      const x = hitbox.box.position.x + hitboxRadius * Math.sin(offsetDirection);
      const y = hitbox.box.position.y + hitboxRadius * Math.cos(offsetDirection);
      createCocoonFragmentParticle(x, y, offsetDirection + randFloat(-0.2, 0.2));
   }
}