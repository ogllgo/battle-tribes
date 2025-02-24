import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { getStringLengthBytes, Packet } from "../../../shared/src/packets";
import { entityExists } from "../world";
import { ComponentArray } from "./ComponentArray";
import { getTamingSkill, TamingSkill, TamingSkillID, TamingTier } from "battletribes-shared/taming";

interface TamingSkillLearning {
   readonly skill: TamingSkill;
   /** Indexes will be the same as the requirements on the skill */
   readonly requirementProgressArray: Array<number>;
}

export class TamingComponent {
   public tamingTier: TamingTier = 0;
   /** Amount of berries eaten in the current tier. */
   public foodEatenInTier = 0;

   public name = "";

   public readonly acquiredSkills = new Array<TamingSkill>();
   public readonly skillLearningArray = new Array<TamingSkillLearning>();
   
   // @Temporary
   public followTarget: Entity = 0;
}

export const TamingComponentArray = new ComponentArray<TamingComponent>(ServerComponentType.taming, true, getDataLength, addDataToPacket);

function getDataLength(entity: Entity): number {
   const tamingComponent = TamingComponentArray.getComponent(entity);
   let lengthBytes = 3 * Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(tamingComponent.name);

   // Acquired skills
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * tamingComponent.acquiredSkills.length;

   // Skill learnings
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const skillLearning of tamingComponent.skillLearningArray) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += Float32Array.BYTES_PER_ELEMENT * skillLearning.requirementProgressArray.length;
   }

   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   
   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const tamingComponent = TamingComponentArray.getComponent(entity);
   packet.addNumber(tamingComponent.tamingTier);
   packet.addNumber(tamingComponent.foodEatenInTier);
   packet.addString(tamingComponent.name);

   // Acquired skills
   packet.addNumber(tamingComponent.acquiredSkills.length);
   for (const skill of tamingComponent.acquiredSkills) {
      packet.addNumber(skill.id);
   }

   // Skill learnings
   packet.addNumber(tamingComponent.skillLearningArray.length);
   for (const skillLearning of tamingComponent.skillLearningArray) {
      packet.addNumber(skillLearning.skill.id);
      for (const requirementProgress of skillLearning.requirementProgressArray) {
         packet.addNumber(requirementProgress);
      }
   }
   
   packet.addBoolean(entityExists(tamingComponent.followTarget));
   packet.padOffset(3);
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

export function addSkillLearningProgress(tamingComponent: TamingComponent, skillID: TamingSkillID, amount: number): void {
   const skill = getTamingSkill(skillID);
   if (tamingComponent.acquiredSkills.includes(skill)) {
      return;
   }
   
   const existingSkillLearning = getTamingSkillLearning(tamingComponent, skillID);
   if (existingSkillLearning !== null) {
      // @Hack
      existingSkillLearning.requirementProgressArray[0] += amount;

      // Clamp it
      const maxAmount = skill.requirements[0].amountRequired;
      if (existingSkillLearning.requirementProgressArray[0] > maxAmount) {
         existingSkillLearning.requirementProgressArray[0] = maxAmount;
      }
   } else {
      const skillLearning: TamingSkillLearning = {
         skill: skill,
         requirementProgressArray: skill.requirements.map(_ => 0)
      };
      // @Hack
      skillLearning.requirementProgressArray[0] = amount;
      tamingComponent.skillLearningArray.push(skillLearning);
   }
}