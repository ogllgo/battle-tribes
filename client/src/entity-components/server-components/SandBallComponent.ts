import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { Settings } from "../../../../shared/src/settings";
import { randAngle, randFloat } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getHitboxVelocity, Hitbox } from "../../hitboxes";
import { createSandParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface SandBallComponentParams {
   readonly size: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface SandBallComponent {
   size: number;
   readonly renderPart: TexturedRenderPart;
}

export const SandBallComponentArray = new ServerComponentArray<SandBallComponent, SandBallComponentParams, IntermediateInfo>(ServerComponentType.sandBall, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick
});

const getTextureSource = (size: number): string => {
   return "entities/sand-ball/size-" + size + ".png";
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const sandBallComponentParams = entityParams.serverComponentParams[ServerComponentType.sandBall]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(getTextureSource(sandBallComponentParams.size))
   );
   renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

export function createSandBallComponentParams(size: number): SandBallComponentParams {
   return {
      size: size
   };
}

function createParamsFromData(reader: PacketReader): SandBallComponentParams {
   const size = reader.readNumber();
   
   return createSandBallComponentParams(size);
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): SandBallComponent {
   const sandBallComponentParams = entityParams.serverComponentParams[ServerComponentType.sandBall]!;

   return {
      size: sandBallComponentParams.size,
      renderPart: intermediateInfo.renderPart,
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(sandBall: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(sandBall);
   if (transformComponent.rootEntity !== sandBall) {
      const hitbox = transformComponent.hitboxes[0];
      const hitboxRadius = (hitbox.box as CircularBox).radius;
      const hitboxVelocity = getHitboxVelocity(hitbox);

      let particleChance = hitboxRadius * Settings.DELTA_TIME * 0.8;
      while (Math.random() < particleChance--) {
         const offsetDirection = randAngle();
         const offsetAmount = hitboxRadius * randFloat(0.7, 1);
         const x = hitbox.box.position.x + offsetAmount * Math.sin(offsetDirection);
         const y = hitbox.box.position.y + offsetAmount * Math.sin(offsetDirection);
         createSandParticle(x, y, hitboxVelocity.x, hitboxVelocity.y, offsetDirection + randFloat(-0.3, 0.3));
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const sandBallComponent = SandBallComponentArray.getComponent(entity);

   const size = reader.readNumber();

   if (size !== sandBallComponent.size) {
      sandBallComponent.renderPart.switchTextureSource(getTextureSource(size));
      sandBallComponent.size = size;
   }
}