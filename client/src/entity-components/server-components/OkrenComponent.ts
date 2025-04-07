import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { entityChildIsHitbox } from "./TransformComponent";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { Entity } from "../../../../shared/src/entities";

export interface OkrenComponentParams {
   readonly size: number;
}

interface IntermediateInfo {}

export interface OkrenComponent {
   size: number;
}

export const OkrenComponentArray = new ServerComponentArray<OkrenComponent, OkrenComponentParams, IntermediateInfo>(ServerComponentType.okren, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
});

function createParamsFromData(reader: PacketReader): OkrenComponentParams {
   const size = reader.readNumber();

   return {
      size: size
   };
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const okrenComponentParams = entityParams.serverComponentParams[ServerComponentType.okren]!;
   
   let sizeString: string;
   switch (okrenComponentParams.size) {
      case 0: sizeString = "juvenile"; break;
      case 1: sizeString = "youth"; break;
      case 2: sizeString = "adult"; break;
      case 3: sizeString = "elder"; break;
      case 4: sizeString = "ancient"; break;
      default: throw new Error();
   }
   
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      if (hitbox.flags.includes(HitboxFlag.OKREN_BODY)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               3,
               0,
               getTextureArrayIndex("entities/okren/" + sizeString + "/body.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_EYE)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               5,
               0,
               getTextureArrayIndex("entities/okren/" + sizeString + "/eye.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_MANDIBLE)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               2,
               0,
               getTextureArrayIndex("entities/okren/" + sizeString + "/mandible.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_BIG_ARM_SEGMENT)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               2,
               0,
               getTextureArrayIndex("entities/okren/" + sizeString + "/big-arm-segment.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               1,
               0,
               getTextureArrayIndex("entities/okren/" + sizeString + "/medium-arm-segment.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
         entityIntermediateInfo.renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               0,
               0,
               getTextureArrayIndex("entities/okren/" + sizeString + "/arm-segment-of-slashing-and-destruction.png")
            )
         );
      }
   }

   return {};
}

function createComponent(entityParams: EntityParams): OkrenComponent {
   const okrenComponentParams = entityParams.serverComponentParams[ServerComponentType.okren]!;
   
   return {
      size: okrenComponentParams.size
   };
}

function getMaxRenderParts(): number {
   return 11;
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, okren: Entity): void {
   const size = reader.readNumber();

   const okrenComponent = OkrenComponentArray.getComponent(okren);
   if (okrenComponent.size !== size) {
      okrenComponent.size = size;
   }
}