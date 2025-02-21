export const enum TamingSkillID {
   follow,
   riding,
   move,
   carry,
   attack,
   shatteredWill
}

export interface TamingSkill {
   readonly id: TamingSkillID;
   readonly name: string;
   readonly description: string;
   readonly requiredTamingTier: number;
   readonly parent: TamingSkillID | null;
   readonly x: number;
   readonly y: number;
}

export const TAMING_SKILLS: ReadonlyArray<TamingSkill> = [
   {
      id: TamingSkillID.follow,
      name: "Follow",
      description: "Allows you to command the cow to follow you.",
      requiredTamingTier: 1,
      parent: null,
      x: 0,
      y: 10
   },
   {
      id: TamingSkillID.riding,
      name: "Riding",
      description: "Allows you to ride the cow.",
      requiredTamingTier: 2,
      parent: TamingSkillID.follow,
      x: -18,
      y: 30
   },
   {
      id: TamingSkillID.move,
      name: "Move",
      description: "Allows you to command the cow to move to a specific location.",
      requiredTamingTier: 2,
      parent: TamingSkillID.follow,
      x: 18,
      y: 30
   },
   {
      id: TamingSkillID.carry,
      name: "Carry",
      description: "Allows you to command the cow to pick up an entity.",
      requiredTamingTier: 3,
      parent: TamingSkillID.riding,
      x: -18,
      y: 50
   },
   {
      id: TamingSkillID.attack,
      name: "Attack",
      description: "Allows you to command the cow to attack enemies.",
      requiredTamingTier: 3,
      parent: TamingSkillID.move,
      x: 6,
      y: 50
   },
   {
      id: TamingSkillID.shatteredWill,
      name: "Shattered Will",
      description: "The cow will no longer run away when you or any friendly tribesmen hit it.",
      requiredTamingTier: 3,
      parent: TamingSkillID.move,
      x: 30,
      y: 50
   }
];

export function getTamingSkillByID(id: TamingSkillID): TamingSkill {
   for (const skill of TAMING_SKILLS) {
      if (skill.id === id) {
         return skill;
      }
   }
   throw new Error();
}

interface TamingTierInfo {
   readonly y: number;
   readonly costBerries: number;
}

export const TAMING_TIER_INFO_RECORD: Record<number, TamingTierInfo> = {
   1: {
      y: 0,
      costBerries: 5
   },
   2: {
      y: 20,
      costBerries: 20
   },
   3: {
      y: 40,
      costBerries: 60
   }
};