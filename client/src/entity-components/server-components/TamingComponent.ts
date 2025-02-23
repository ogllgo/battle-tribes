import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { PacketReader } from "../../../../shared/src/packets";
import { getTamingSkill, TamingSkill, TamingSkillID } from "../../../../shared/src/taming";
import Board from "../../Board";
import { getPlayerSelectedItem } from "../../components/game/GameInteractableLayer";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";

interface TamingSkillLearning {
   readonly skill: TamingSkill;
   /** Indexes will be the same as the requirements on the skill */
   readonly requirementProgressArray: Array<number>;
   lastUpdateTicks: number;
}

export interface TamingComponentParams {
   readonly tamingTier: number;
   readonly berriesEatenInTier: number;
   readonly name: string;
   readonly acquiredSkills: Array<TamingSkill>;
   readonly skillLearningArray: Array<TamingSkillLearning>;
}

interface RenderParts {
   readonly tamingTierRenderPart: TexturedRenderPart | null;
}

export class TamingComponent {
   public tamingTier: number;
   public foodEatenInTier: number;
   public name: string;
   public readonly acquiredSkills: Array<TamingSkill>;
   public readonly skillLearningArray: Array<TamingSkillLearning>;

   public tamingTierRenderPart: TexturedRenderPart | null;

   constructor(tamingTier: number, berriesEatenInTier: number, name: string, acquiredSkills: Array<TamingSkill>, skillLearningArray: Array<TamingSkillLearning>, tamingTierRenderPart: TexturedRenderPart | null) {
      this.tamingTier = tamingTier;
      this.foodEatenInTier = berriesEatenInTier;
      this.name = name;
      this.acquiredSkills = acquiredSkills;
      this.skillLearningArray = skillLearningArray;
      this.tamingTierRenderPart = tamingTierRenderPart;
   }
}
const TAMING_TIER_TEXTURE_SOURCES: Record<number, string> = {
   1: "entities/miscellaneous/taming-tier-1.png",
   2: "entities/miscellaneous/taming-tier-2.png",
   3: "entities/miscellaneous/taming-tier-3.png"
};

export const TamingComponentArray = new ServerComponentArray<TamingComponent, TamingComponentParams, RenderParts>(ServerComponentType.taming, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick
});

function createParamsFromData(reader: PacketReader): TamingComponentParams {
   const tamingTier = reader.readNumber();
   const berriesEatenInTier = reader.readNumber();
   const name = reader.readString();

   const numAcquiredSkills = reader.readNumber();
   const acquiredSkills = new Array<TamingSkill>();
   for (let i = 0; i < numAcquiredSkills; i++) {
      const skillID = reader.readNumber() as TamingSkillID;
      const skill = getTamingSkill(skillID);
      acquiredSkills.push(skill);
   }

   const numSkillLearnings = reader.readNumber();
   const skillLearningArray = new Array<TamingSkillLearning>();
   for (let i = 0; i < numSkillLearnings; i++) {
      const skillID = reader.readNumber() as TamingSkillID;
      const skill = getTamingSkill(skillID);

      const requirementProgressArray = new Array<number>();
      for (let i = 0; i < skill.requirements.length; i++) {
         const requirementProgress = reader.readNumber();
         requirementProgressArray.push(requirementProgress);
      }
      
      const skillLearning: TamingSkillLearning = {
         skill: skill,
         requirementProgressArray: requirementProgressArray,
         lastUpdateTicks: Board.serverTicks
      };
      skillLearningArray.push(skillLearning);
   }
   
   return {
      tamingTier: tamingTier,
      berriesEatenInTier: berriesEatenInTier,
      name: name,
      acquiredSkills: acquiredSkills,
      skillLearningArray: skillLearningArray
   };
}

const getTamingTierRenderPartOpacity = (): number => {
   const heldItem = getPlayerSelectedItem();
   if (heldItem !== null && (heldItem.type === ItemType.animalStaff || heldItem.type === ItemType.tamingAlmanac)) {
      return 0.55;
   }
   return 0;
}

const createTamingTierRenderPart = (tamingTier: number): TexturedRenderPart => {
   const renderPart = new TexturedRenderPart(
      null,
      1,
      0,
      getTextureArrayIndex(TAMING_TIER_TEXTURE_SOURCES[tamingTier])
   );
   renderPart.inheritParentRotation = false;
   renderPart.opacity = getTamingTierRenderPartOpacity();
   return renderPart;
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.taming, never>): RenderParts {
   const tamingComponentParams = entityConfig.serverComponents[ServerComponentType.taming];
   const tamingTier = tamingComponentParams.tamingTier;

   const tamingTierRenderPart = tamingTier > 0 ? createTamingTierRenderPart(tamingTier) : null;
   // @Speed: 2nd comparison
   if (tamingTierRenderPart !== null) {
      renderInfo.attachRenderPart(tamingTierRenderPart);
   }
   
   return {
      tamingTierRenderPart: tamingTierRenderPart
   }
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.taming, never>, renderParts: RenderParts): TamingComponent {
   const tamingComponentParams = entityConfig.serverComponents[ServerComponentType.taming];
   return {
      tamingTier: tamingComponentParams.tamingTier,
      foodEatenInTier: tamingComponentParams.berriesEatenInTier,
      name: tamingComponentParams.name,
      acquiredSkills: tamingComponentParams.acquiredSkills,
      skillLearningArray: tamingComponentParams.skillLearningArray,
      tamingTierRenderPart: renderParts.tamingTierRenderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   reader.padString();

   const numAcquiredSkills = reader.readNumber();
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT * numAcquiredSkills);
}

export function getTamingSkillLearning(tamingComponent: TamingComponent, skillID: TamingSkillID): TamingSkillLearning | null {
   for (const skillLearning of tamingComponent.skillLearningArray) {
      if (skillLearning.skill.id === skillID) {
         return skillLearning;
      }
   }
   return null;
}

export function skillLearningIsComplete(skillLearning: TamingSkillLearning): boolean {
   for (let i = 0; i < skillLearning.skill.requirements.length; i++) {
      const requirement = skillLearning.skill.requirements[0];
      const requirementProgress = skillLearning.requirementProgressArray[0];
      if (requirementProgress < requirement.amountRequired) {
         return false;
      }
   }

   return true;
}

function onTick(entity: Entity): void {
   // @Speed
   const tamingComponent = TamingComponentArray.getComponent(entity);
   if (tamingComponent.tamingTierRenderPart !== null) {
      tamingComponent.tamingTierRenderPart.opacity = getTamingTierRenderPartOpacity();
   }
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const tamingComponent = TamingComponentArray.getComponent(entity);

   const tamingTier = reader.readNumber();
   if (tamingTier !== tamingComponent.tamingTier) {
      if (tamingComponent.tamingTierRenderPart === null) {
         tamingComponent.tamingTierRenderPart = createTamingTierRenderPart(tamingTier);
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(tamingComponent.tamingTierRenderPart);
      } else {
         tamingComponent.tamingTierRenderPart.textureArrayIndex = getTextureArrayIndex(TAMING_TIER_TEXTURE_SOURCES[tamingTier]);
      }
   }
   tamingComponent.tamingTier = tamingTier;
   
   tamingComponent.foodEatenInTier = reader.readNumber();
   tamingComponent.name = reader.readString();

   const newNumAcquiredSkills = reader.readNumber();
   for (let i = 0; i < newNumAcquiredSkills; i++) {
      if (i < tamingComponent.acquiredSkills.length) {
         reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      } else {
         const skillID = reader.readNumber() as TamingSkillID;
         const skill = getTamingSkill(skillID);
         tamingComponent.acquiredSkills.push(skill);
      }
   }

   // Update existing/new skill learnings
   const numSkillLearnings = reader.readNumber();
   for (let i = 0; i < numSkillLearnings; i++) {
      const skillID = reader.readNumber() as TamingSkillID;
      const skill = getTamingSkill(skillID);

      const existingSkillLearning = getTamingSkillLearning(tamingComponent, skillID);
      if (existingSkillLearning !== null) {
         // Update requirement progress array
         for (let i = 0; i < skill.requirements.length; i++) {
            existingSkillLearning.requirementProgressArray[i] = reader.readNumber();
         }

         existingSkillLearning.lastUpdateTicks = Board.serverTicks;
      } else {
         const requirementProgressArray = new Array<number>();
         for (let i = 0; i < skill.requirements.length; i++) {
            const requirementProgress = reader.readNumber();
            requirementProgressArray.push(requirementProgress);
         }

         const skillLearning: TamingSkillLearning = {
            skill: skill,
            requirementProgressArray: requirementProgressArray,
            lastUpdateTicks: Board.serverTicks
         };
         tamingComponent.skillLearningArray.push(skillLearning);
      }
   }

   // Remove old skill learnings
   for (let i = 0; i < tamingComponent.skillLearningArray.length; i++) {
      const skillLearning = tamingComponent.skillLearningArray[i];
      if (skillLearning.lastUpdateTicks !== Board.serverTicks) {
         tamingComponent.skillLearningArray.splice(i, 1);
         i--;
      }
   }
}

export function hasTamingSkill(tamingComponent: TamingComponent, skillID: TamingSkillID): boolean {
   for (const skill of tamingComponent.acquiredSkills) {
      if (skill.id === skillID) {
         return true;
      }
   }
   return false;
}