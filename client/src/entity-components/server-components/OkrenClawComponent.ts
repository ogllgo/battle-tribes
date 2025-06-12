import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { OkrenAgeStage } from "./OkrenComponent";
import { entityChildIsHitbox } from "./TransformComponent";

export interface OkrenClawComponentParams {
   readonly size: OkrenAgeStage;
   readonly growthStage: number;
}

interface IntermediateInfo {
   // @Memory
   readonly bigArmSegment: TexturedRenderPart;
   readonly mediumArmSegment: TexturedRenderPart;
   readonly slashingArmSegment: TexturedRenderPart;
}

export interface OkrenClawComponent {
   growthStage: number;
   // @Memory
   readonly bigArmSegment: TexturedRenderPart;
   readonly mediumArmSegment: TexturedRenderPart;
   readonly slashingArmSegment: TexturedRenderPart;
}

export const OkrenClawComponentArray = new ServerComponentArray<OkrenClawComponent, OkrenClawComponentParams, IntermediateInfo>(ServerComponentType.okrenClaw, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (size: OkrenAgeStage, growthStage: number): OkrenClawComponentParams => {
   return {
      size: size,
      growthStage: growthStage
   };
}

function createParamsFromData(reader: PacketReader): OkrenClawComponentParams {
   const size = reader.readNumber();
   const growthStage = reader.readNumber();
   return fillParams(size, growthStage);
}

const getSizeString = (size: OkrenAgeStage): string => {
   switch (size) {
      case OkrenAgeStage.juvenile: return "juvenile";
      case OkrenAgeStage.youth:    return "youth";
      case OkrenAgeStage.adult:    return "adult";
      case OkrenAgeStage.elder:    return "elder";
      case OkrenAgeStage.ancient:  return "ancient";
   }
}

const getGrowthStageString = (growthStage: number): string => {
   return (growthStage + 1).toString();
}

const getBigArmSegmentTextureSource = (sizeString: string, growthStageString: string): string => {
   return "entities/okren/" + sizeString + "/big-arm-segment-" + growthStageString + ".png";
}

const getMediumArmSegmentTextureSource = (sizeString: string, growthStageString: string): string => {
   return "entities/okren/" + sizeString + "/medium-arm-segment-" + growthStageString + ".png";
}

const getSlashingArmSegmentTextureSource = (sizeString: string, growthStageString: string): string => {
   return "entities/okren/" + sizeString + "/arm-segment-of-slashing-and-destruction-" + growthStageString + ".png";
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const okrenClawComponentParams = entityParams.serverComponentParams[ServerComponentType.okrenClaw]!;

   const sizeString = getSizeString(okrenClawComponentParams.size);
   const growthStageString = getGrowthStageString(okrenClawComponentParams.growthStage);
   
   let bigArmSegment!: TexturedRenderPart;
   let mediumArmSegment!: TexturedRenderPart;
   let slashingArmSegment!: TexturedRenderPart;
   
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }

      if (hitbox.flags.includes(HitboxFlag.OKREN_BIG_ARM_SEGMENT)) {
         bigArmSegment = new TexturedRenderPart(
            hitbox,
            2,
            0,
            getTextureArrayIndex(getBigArmSegmentTextureSource(sizeString, growthStageString))
         );
         entityIntermediateInfo.renderInfo.attachRenderPart(bigArmSegment);
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT)) {
         mediumArmSegment = new TexturedRenderPart(
            hitbox,
            1,
            0,
            getTextureArrayIndex(getMediumArmSegmentTextureSource(sizeString, growthStageString))
         )
         entityIntermediateInfo.renderInfo.attachRenderPart(mediumArmSegment);
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
         slashingArmSegment = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex(getSlashingArmSegmentTextureSource(sizeString, growthStageString))
         )
         entityIntermediateInfo.renderInfo.attachRenderPart(slashingArmSegment);
      }
   }

   return {
      bigArmSegment: bigArmSegment,
      mediumArmSegment: mediumArmSegment,
      slashingArmSegment: slashingArmSegment
   };
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): OkrenClawComponent {
   const okrenClawComponentParams = entityParams.serverComponentParams[ServerComponentType.okrenClaw]!;

   return {
      growthStage: okrenClawComponentParams.growthStage,
      bigArmSegment: intermediateInfo.bigArmSegment,
      mediumArmSegment: intermediateInfo.mediumArmSegment,
      slashingArmSegment: intermediateInfo.slashingArmSegment
   };
}

function getMaxRenderParts(): number {
   return 3;
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const size = reader.readNumber();
   const growthStage = reader.readNumber();

   const okrenClawComponent = OkrenClawComponentArray.getComponent(entity);
   if (growthStage !== okrenClawComponent.growthStage) {
      okrenClawComponent.growthStage = growthStage;
      
      const sizeString = getSizeString(size);
      const growthStageString = getGrowthStageString(growthStage);
      okrenClawComponent.bigArmSegment.switchTextureSource(getBigArmSegmentTextureSource(sizeString, growthStageString));
      okrenClawComponent.mediumArmSegment.switchTextureSource(getMediumArmSegmentTextureSource(sizeString, growthStageString));
      okrenClawComponent.slashingArmSegment.switchTextureSource(getSlashingArmSegmentTextureSource(sizeString, growthStageString));
   }
}