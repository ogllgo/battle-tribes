import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";
import { PacketReader } from "../../../../shared/src/packets";
import { TransformComponentArray } from "./TransformComponent";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { Settings } from "../../../../shared/src/settings";
import { randAngle, randFloat } from "../../../../shared/src/utils";
import { createCocoonAmbientParticle } from "../../particles";

export interface DustfleaMorphCocoonComponentParams {
   readonly stage: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface DustfleaMorphCocoonComponent {
   stage: number;
   readonly renderPart: TexturedRenderPart;
}

export const DustfleaMorphCocoonComponentArray = new ServerComponentArray<DustfleaMorphCocoonComponent, DustfleaMorphCocoonComponentParams, IntermediateInfo>(ServerComponentType.dustfleaMorphCocoon, true, {
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
   return "entities/dustflea-morph-cocoon/stage-" + stage + ".png";
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   const dustfleaMorphCocoonComponentParams = entityParams.serverComponentParams[ServerComponentType.dustfleaMorphCocoon]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(getTextureSource(dustfleaMorphCocoonComponentParams.stage))
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

export function createDustfleaMorphCocoonComponentParams(stage: number): DustfleaMorphCocoonComponentParams {
   return {
      stage: stage
   };
}

function createParamsFromData(reader: PacketReader): DustfleaMorphCocoonComponentParams {
   const stage = reader.readNumber();
   
   return createDustfleaMorphCocoonComponentParams(stage);
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): DustfleaMorphCocoonComponent {
   const dustfleaMorphCocoonComponentParams = entityParams.serverComponentParams[ServerComponentType.dustfleaMorphCocoon]!;

   return {
      stage: dustfleaMorphCocoonComponentParams.stage,
      renderPart: intermediateInfo.renderPart,
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(cocoon: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(cocoon);
   const hitbox = transformComponent.children[0] as Hitbox;

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
   const dustfleaMorphComponent = DustfleaMorphCocoonComponentArray.getComponent(entity);

   const stage = reader.readNumber();

   if (stage !== dustfleaMorphComponent.stage) {
      dustfleaMorphComponent.renderPart.switchTextureSource(getTextureSource(stage));
      dustfleaMorphComponent.stage = stage;
   }
}

function onHit(entity: Entity): void {
   // const transformComponent = TransformComponentArray.getComponent(entity);
   // const hitbox = transformComponent.children[0] as Hitbox;
   // playBuildingHitSound(entity, hitbox);
}

function onDie(entity: Entity): void {
   // const transformComponent = TransformComponentArray.getComponent(entity);
   // const hitbox = transformComponent.children[0] as Hitbox;
   // playSoundOnHitbox("building-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
}