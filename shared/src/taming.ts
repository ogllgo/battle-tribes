import { ItemType } from "./items/items";

export const enum TamingSkillID {
   follow,
   riding,
   move,
   carry,
   attack,
   shatteredWill
}

export type TamingTier = 0 | 1 | 2 | 3;

export interface TamingSkillRequirement {
   readonly description: string;
   readonly amountRequired: number;
   readonly suffix: string;
}

export interface TamingSkill {
   readonly id: TamingSkillID;
   readonly name: string;
   readonly description: string;
   readonly requirements: ReadonlyArray<TamingSkillRequirement>;
   readonly requiredTamingTier: number;
   readonly parent: TamingSkillID | null;
}

export interface TamingSkillNode {
   readonly skill: TamingSkill;
   readonly x: number;
   readonly y: number;
}

export interface EntityTamingSpec<TamingTiers extends TamingTier = TamingTier> {
   readonly maxTamingTier: TamingTier;
   readonly skillNodes: ReadonlyArray<TamingSkillNode>;
   readonly foodItemType: ItemType;
   readonly tierFoodRequirements: Record<TamingTiers, number>;
}

export const TAMING_SKILL_RECORD: Record<TamingSkillID, TamingSkill> = {
   [TamingSkillID.follow]: {
      id: TamingSkillID.follow,
      name: "Follow",
      description: "Allows you to command the cow to follow you.",
      requirements: [
         {
            description: "Time around cow",
            amountRequired: 30,
            suffix: " seconds"
         }
      ],
      requiredTamingTier: 1,
      parent: null
   },
   [TamingSkillID.riding]: {
      id: TamingSkillID.riding,
      name: "Riding",
      description: "Allows you to ride the cow.",
      requirements: [
         {
            description: "Mount attempts",
            amountRequired: 5,
            suffix: " attempts"
         }
      ],
      requiredTamingTier: 2,
      parent: TamingSkillID.follow
   },
   [TamingSkillID.move]: {
      id: TamingSkillID.move,
      name: "Move",
      description: "Allows you to command the cow to move to a specific location.",
      requirements: [
         {
            description: "Time spent following",
            amountRequired: 30,
            suffix: " seconds"
         }
      ],
      requiredTamingTier: 2,
      parent: TamingSkillID.follow
   },
   [TamingSkillID.carry]: {
      id: TamingSkillID.carry,
      name: "Carry",
      description: "Allows you to command the cow to pick up an entity.",
      requirements: [
         {
            description: "Time spent riding",
            amountRequired: 120,
            suffix: " seconds"
         }
      ],
      requiredTamingTier: 3,
      parent: TamingSkillID.riding
   },
   [TamingSkillID.attack]: {
      id: TamingSkillID.attack,
      name: "Attack",
      description: "Allows you to command the cow to attack enemies.",
      requirements: [
         {
            description: "Time spent being moved",
            amountRequired: 30,
            suffix: " seconds"
         }
      ],
      requiredTamingTier: 3,
      parent: TamingSkillID.move
   },
   [TamingSkillID.shatteredWill]: {
      id: TamingSkillID.shatteredWill,
      name: "Shattered Will",
      description: "The cow will no longer run away when you or any friendly tribesmen hit it.",
      requirements: [
         {
            description: "Damage taken",
            amountRequired: 15,
            suffix: " damage"
         }
      ],
      requiredTamingTier: 3,
      parent: TamingSkillID.move
   }
};

export function getTamingSkill(id: TamingSkillID): TamingSkill {
   return TAMING_SKILL_RECORD[id];
}